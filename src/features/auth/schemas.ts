import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .pipe(z.email("Informe um e-mail válido."));

const newPassword = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), {
    message: "A senha precisa ter letras e números.",
  });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  email,
  password: newPassword,
  termsAccepted: z.literal(true, { error: "Aceite os termos para continuar." }),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, "Repita a nova senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
