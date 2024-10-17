/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
"use server"

import crypto from "crypto"
import axios from "axios"

import { signIn } from "@/auth"
import bcryptjs from "bcryptjs"
import { AuthError } from "next-auth"

import { env } from "@/env.mjs"
import { resend } from "@/config/email"
import {
  signInWithPasswordSchema,
  signUpWithPasswordSchema,
  type SignInWithPasswordFormInput,
  type SignUpWithPasswordFormInput,
} from "@/validations/auth"

import { EmailVerificationEmail } from "@/components/emails/email-verification-email"

export async function signUpWithPassword(
  rawInput: SignUpWithPasswordFormInput
): Promise<"invalid-input" | "exists" | "error" | "success"> {
  try {
    const validatedInput = signUpWithPasswordSchema.safeParse(rawInput)
    if (!validatedInput.success) return "invalid-input"


    const passwordHash = await bcryptjs.hash(validatedInput.data.password, 10)
    const emailVerificationToken = crypto.randomBytes(32).toString("base64url")

    let newUser;
    try {
      newUser = await axios.post(`${env.NEXT_PUBLIC_APP_URL}/users`, {
        email: validatedInput.data.email,
        passwordHash,
        emailVerificationToken,
      });
    } catch (error) {
      console.error("Error creating new user:", error);
      return "error";
    }

    const emailSent = await resend.emails.send({
      from: env.RESEND_EMAIL_FROM,
      to: [validatedInput.data.email],
      subject: "Verify your email address",
      react: EmailVerificationEmail({
        email: validatedInput.data.email,
        emailVerificationToken,
      }),
    })

    return newUser && emailSent ? "success" : "error"
  } catch (error) {
    console.error(error)
    throw new Error("Error signing up with password")
  }
}

export async function signInWithPassword(
  rawInput: SignInWithPasswordFormInput
): Promise<
  | "invalid-input"
  | "invalid-credentials"
  | "not-registered"
  | "unverified-email"
  | "incorrect-provider"
  | "success"
> {
  try {
    const validatedInput = signInWithPasswordSchema.safeParse(rawInput)
    if (!validatedInput.success) return "invalid-input"

    await signIn("credentials", {
      email: validatedInput.data.email,
      password: validatedInput.data.password,
      redirect: false,
    })

    return "success"
  } catch (error) {
    console.error(error)
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "invalid-credentials"
        default:
          throw error
      }
    } else {
      throw new Error("Error signin in with password")
    }
  }
}
