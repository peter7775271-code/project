import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

const nodemailer = require('nodemailer');

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      // Return success anyway to prevent email enumeration attacks
      return NextResponse.json(
        { message: 'If an account exists with that email, a reset link has been sent.' },
        { status: 200 }
      );
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = uuidv4();
    const expiryTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    db.prepare(
      `UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?`
    ).run(resetToken, expiryTime.toISOString(), email);

    // Send reset email
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      await transporter.sendMail({
        to: email,
        subject: 'Reset your password',
        html: `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
          <p>Or copy this link: ${resetLink}</p>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Continue anyway - user can try again
    }

    return NextResponse.json(
      { message: 'If an account exists with that email, a reset link has been sent.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
