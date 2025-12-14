import {
    startRegistration,
    startAuthentication,
} from 'https://unpkg.com/@simplewebauthn/browser@9.0.1/dist/bundle/index.js';

let currentUser = null;

function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.innerHTML = `<div class="message ${type}">${message}</div>`;
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

function showAuthSection() {
    document.getElementById('authSection').classList.add('active');
    document.getElementById('calculatorSection').classList.remove('active');
}

function showCalculatorSection() {
    document.getElementById('authSection').classList.remove('active');
    document.getElementById('calculatorSection').classList.add('active');
}

window.register = async function() {
    const username = document.getElementById('username').value.trim();

    if (!username) {
        showMessage('Please enter a username', 'error');
        return;
    }

    try {
        const optionsResponse = await fetch('/api/auth/register/options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
        });

        if (!optionsResponse.ok) {
            throw new Error('Failed to get registration options');
        }

        const options = await optionsResponse.json();

        const registrationResponse = await startRegistration(options);

        const verificationResponse = await fetch('/api/auth/register/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, response: registrationResponse }),
        });

        if (!verificationResponse.ok) {
            throw new Error('Registration verification failed');
        }

        const verificationResult = await verificationResponse.json();

        if (verificationResult.verified) {
            currentUser = verificationResult.user;
            document.getElementById('currentUser').textContent = currentUser.username;
            showCalculatorSection();
            showMessage('Registration successful!', 'success');
        } else {
            throw new Error('Registration not verified');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage(`Registration failed: ${error.message}`, 'error');
    }
};

window.login = async function() {
    const username = document.getElementById('username').value.trim();

    if (!username) {
        showMessage('Please enter a username', 'error');
        return;
    }

    try {
        const optionsResponse = await fetch('/api/auth/login/options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
        });

        if (!optionsResponse.ok) {
            const error = await optionsResponse.json();
            throw new Error(error.error || 'Failed to get login options');
        }

        const options = await optionsResponse.json();

        const authenticationResponse = await startAuthentication(options);

        const verificationResponse = await fetch('/api/auth/login/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, response: authenticationResponse }),
        });

        if (!verificationResponse.ok) {
            throw new Error('Login verification failed');
        }

        const verificationResult = await verificationResponse.json();

        if (verificationResult.verified) {
            currentUser = verificationResult.user;
            document.getElementById('currentUser').textContent = currentUser.username;
            showCalculatorSection();
            showMessage('Login successful!', 'success');
        } else {
            throw new Error('Login not verified');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage(`Login failed: ${error.message}`, 'error');
    }
};

window.logout = function() {
    currentUser = null;
    document.getElementById('username').value = '';
    document.getElementById('radius').value = '';
    document.getElementById('result').classList.add('hidden');
    showAuthSection();
    showMessage('Logged out successfully', 'info');
};

window.calculate = async function() {
    const radius = document.getElementById('radius').value;

    if (!radius || isNaN(radius) || parseFloat(radius) <= 0) {
        showMessage('Please enter a valid radius', 'error');
        return;
    }

    try {
        const response = await fetch('/api/calculator/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ radius: parseFloat(radius) }),
        });

        if (!response.ok) {
            throw new Error('Calculation failed');
        }

        const result = await response.json();

        document.getElementById('resultRadius').textContent = result.radius.toFixed(2);
        document.getElementById('resultArea').textContent = result.area.toFixed(4);
        document.getElementById('resultCircumference').textContent = result.circumference.toFixed(4);
        document.getElementById('result').classList.remove('hidden');

        showMessage('Calculation completed!', 'success');
    } catch (error) {
        console.error('Calculation error:', error);
        showMessage(`Calculation failed: ${error.message}`, 'error');
    }
};
