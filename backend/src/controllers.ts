/**
 * Re-exports modular controllers to preserve zero contract breakage with routes.ts
 */
export {
  authController,
  AuthUserPayload,
  AuthenticatedRequest,
  sendSuccess,
  sendError,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema
} from './modules/auth';

export { jobController } from './modules/jobs';
export { payoutController } from './modules/finance';