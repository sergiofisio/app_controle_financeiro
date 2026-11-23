import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(8, "Senha com no mínimo 8 caracteres"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome"),
    email: z.email("Informe um e-mail válido"),
    password: z.string().min(8, "Senha com no mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email("Informe um e-mail válido"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Senha com no mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().min(2, "Informe seu nome"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Senha atual obrigatória"),
    newPassword: z.string().min(8, "Nova senha com no mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme a nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
