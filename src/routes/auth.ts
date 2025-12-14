import { Router } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server/script/deps';
import {
  getUserByUsername,
  createUser,
  getAuthenticatorsByUserId,
  saveAuthenticator,
  getAuthenticatorByCredentialId,
  updateAuthenticatorCounter,
} from '../database';

const router = Router();

const rpName = process.env.RP_NAME || 'Circle Calculator';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.ORIGIN || 'http://localhost:3000';

const challengeStore = new Map<string, string>();

router.post('/register/options', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    let user = await getUserByUsername(username);

    if (!user) {
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      user = await createUser(userId, username);
    }

    const userAuthenticators = await getAuthenticatorsByUserId(user.id);

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: username,
      attestationType: 'none',
      excludeCredentials: userAuthenticators.map((auth) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports ? JSON.parse(auth.transports) : [],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    challengeStore.set(username, options.challenge);

    res.json(options);
  } catch (error) {
    console.error('Registration options error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

router.post('/register/verify', async (req, res) => {
  try {
    const { username, response } = req.body;

    if (!username || !response) {
      return res.status(400).json({ error: 'Username and response are required' });
    }

    const expectedChallenge = challengeStore.get(username);

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Challenge not found' });
    }

    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const verification = await verifyRegistrationResponse({
      response: response as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const {
        credentialPublicKey,
        credentialID,
        counter,
        credentialDeviceType,
        credentialBackedUp,
      } = registrationInfo;

      const transports = response.response?.transports || [];

      await saveAuthenticator(
        user.id,
        Buffer.from(credentialID),
        Buffer.from(credentialPublicKey),
        counter,
        credentialDeviceType,
        credentialBackedUp,
        transports
      );

      challengeStore.delete(username);

      res.json({ verified: true, user: { id: user.id, username: user.username } });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (error) {
    console.error('Registration verification error:', error);
    res.status(500).json({ error: 'Failed to verify registration' });
  }
});

router.post('/login/options', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userAuthenticators = await getAuthenticatorsByUserId(user.id);

    if (userAuthenticators.length === 0) {
      return res.status(404).json({ error: 'No authenticators found for this user' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userAuthenticators.map((auth) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports ? JSON.parse(auth.transports) : [],
      })),
      userVerification: 'preferred',
    });

    challengeStore.set(username, options.challenge);

    res.json(options);
  } catch (error) {
    console.error('Login options error:', error);
    res.status(500).json({ error: 'Failed to generate login options' });
  }
});

router.post('/login/verify', async (req, res) => {
  try {
    const { username, response } = req.body;

    if (!username || !response) {
      return res.status(400).json({ error: 'Username and response are required' });
    }

    const expectedChallenge = challengeStore.get(username);

    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Challenge not found' });
    }

    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const authenticator = await getAuthenticatorByCredentialId(
      Buffer.from(response.rawId, 'base64')
    );

    if (!authenticator) {
      return res.status(404).json({ error: 'Authenticator not found' });
    }

    const verification = await verifyAuthenticationResponse({
      response: response as AuthenticationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: authenticator.credential_id,
        credentialPublicKey: authenticator.credential_public_key,
        counter: Number(authenticator.counter),
      },
    });

    const { verified, authenticationInfo } = verification;

    if (verified) {
      await updateAuthenticatorCounter(
        authenticator.credential_id,
        authenticationInfo.newCounter
      );

      challengeStore.delete(username);

      res.json({ verified: true, user: { id: user.id, username: user.username } });
    } else {
      res.status(400).json({ error: 'Verification failed' });
    }
  } catch (error) {
    console.error('Login verification error:', error);
    res.status(500).json({ error: 'Failed to verify login' });
  }
});

export default router;
