import { Router } from 'express';

const router = Router();

router.post('/calculate', (req, res) => {
  try {
    const { radius } = req.body;

    if (!radius || isNaN(radius) || radius <= 0) {
      return res.status(400).json({ error: 'Valid radius is required' });
    }

    const r = parseFloat(radius);
    const area = Math.PI * r * r;
    const circumference = 2 * Math.PI * r;

    res.json({
      radius: r,
      area: area,
      circumference: circumference,
      pi: Math.PI,
    });
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate' });
  }
});

export default router;
