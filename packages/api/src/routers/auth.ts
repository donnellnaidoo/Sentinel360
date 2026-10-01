import { protectedProcedure, publicProcedure, router } from "../index";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordByCodeSchema,
  verifyResetCodeSchema,
} from "../validators";
import {
  changePassword,
  requestPasswordReset,
  resetPasswordWithCode,
  verifyPasswordResetCode,
} from "../services/password-reset";

console.log("[authRouter] forgotPassword procedure loaded");

export const authRouter = router({
  forgotPassword: publicProcedure.input(forgotPasswordSchema).mutation(async ({ input }) => {
    return requestPasswordReset(input.email);
  }),

  verifyResetCode: publicProcedure.input(verifyResetCodeSchema).mutation(async ({ input }) => {
    return verifyPasswordResetCode(input.email, input.code);
  }),

  resetPassword: publicProcedure.input(resetPasswordByCodeSchema).mutation(async ({ input }) => {
    return resetPasswordWithCode(input.email, input.code, input.password);
  }),

  changePassword: protectedProcedure.input(changePasswordSchema).mutation(async ({ ctx, input }) => {
    return changePassword(
      ctx.session.user.id,
      ctx.session.user.email,
      input.currentPassword,
      input.newPassword,
    );
  }),
});
