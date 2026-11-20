import { describe, it, expect } from 'vitest';
import {
  hasFeatureAccess,
  getUserPlanId,
  getTierLevel,
  getRequiredPlanForFeature,
} from '../src/constants/subscriptionPlans.js';
import {
  sanitizeMobile,
  generateLicenseId,
  isNumericLicenseId,
  ensureValidLicenseId,
  evaluateSubscriptionStatus,
} from '../src/services/authApi.js';

describe('Subscription, Licensing & Auth Policy Tests', () => {
  it('correctly gates feature permissions based on user subscription tier', () => {
    const starterUser = { subscription: { planId: 'starter' } };
    const proUser = { subscription: { planId: 'pro' } };
    const enterpriseUser = { subscription: { planId: 'enterprise' } };

    // Starter features: sales_invoicing should be allowed on all tiers
    expect(hasFeatureAccess(starterUser, 'sales_invoicing')).toBe(true);
    expect(hasFeatureAccess(proUser, 'sales_invoicing')).toBe(true);

    // Pro features: cloud_sync requires pro or above
    expect(hasFeatureAccess(starterUser, 'cloud_sync')).toBe(false);
    expect(hasFeatureAccess(proUser, 'cloud_sync')).toBe(true);
    expect(hasFeatureAccess(enterpriseUser, 'cloud_sync')).toBe(true);

    // Enterprise features: user_management requires enterprise
    expect(hasFeatureAccess(starterUser, 'user_management')).toBe(false);
    expect(hasFeatureAccess(proUser, 'user_management')).toBe(false);
    expect(hasFeatureAccess(enterpriseUser, 'user_management')).toBe(true);
  });

  it('determines plan tier hierarchy correctly', () => {
    expect(getUserPlanId(null)).toBe('starter');
    expect(getUserPlanId({ subscription: { planId: 'pro' } })).toBe('pro');
    expect(getUserPlanId({ username: 'admin' })).toBe('enterprise');

    expect(getTierLevel('starter')).toBe(1);
    expect(getTierLevel('pro')).toBe(2);
    expect(getTierLevel('enterprise')).toBe(3);
  });

  it('retrieves required plan configuration for specific features', () => {
    const requiredForSync = getRequiredPlanForFeature('cloud_sync');
    expect(requiredForSync.id).toBe('pro');

    const requiredForTeam = getRequiredPlanForFeature('user_management');
    expect(requiredForTeam.id).toBe('enterprise');
  });

  it('sanitizes 10-digit Indian mobile numbers cleanly', () => {
    expect(sanitizeMobile('+91 98765-43210')).toBe('9876543210');
    expect(sanitizeMobile('09876543210')).toBe('9876543210');
    expect(sanitizeMobile('9876543210')).toBe('9876543210');
    expect(sanitizeMobile('123')).toBe('123');
    expect(sanitizeMobile('')).toBe('');
  });

  it('generates formatted numeric license identifiers', () => {
    const license = generateLicenseId({ state: 'Maharashtra', locality: 'Mumbai' });
    expect(typeof license).toBe('string');
    expect(isNumericLicenseId(license)).toBe(true);
  });

  it('ensures and maintains valid license ID on user objects', () => {
    const userWithoutLicense = { username: 'testuser', state: 'Delhi' };
    const licenseId = ensureValidLicenseId(userWithoutLicense);
    expect(licenseId).toBeDefined();
    expect(isNumericLicenseId(licenseId)).toBe(true);
    expect(userWithoutLicense.licenseId).toBe(licenseId);
  });

  it('evaluates subscription status: active vs expired', () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const activeUser = {
      username: 'john',
      subscription: {
        status: 'Active',
        validUntil: futureDate,
      },
    };
    const activeSub = evaluateSubscriptionStatus(activeUser);
    expect(activeSub.isExpired).toBe(false);
    expect(activeSub.status).toBe('active');

    const expiredUser = {
      username: 'jane',
      subscription: {
        status: 'Active',
        validUntil: pastDate,
      },
    };
    const expiredSub = evaluateSubscriptionStatus(expiredUser);
    expect(expiredSub.isExpired).toBe(true);
    expect(expiredSub.status).toBe('expired');
  });
});
