/**
 * Secrets Overlay — EXAMPLE / TEMPLATE
 *
 * HOW TO USE:
 *   1. Copy this file to  env/env.local.secrets.js    (for local dev)
 *                      or env/env.dev.secrets.js      (for dev)
 *                      or env/env.uat.secrets.js      (for uat)  etc.
 *   2. Fill in your real secret values.
 *   3. The generate-env.js script will merge these over the base env file.
 *
 * ✅ This file IS committed to git (it has no real secrets)
 * ❌ env/*.secrets.js  are git-ignored (never committed, never seen by AI)
 */

export default {
    // API Keys
    API_KEY: 'HgnqXDUGGRmt5M585EzdEpXKK6kNtQ68nfPuwV_G2-f8iou9J_eB8U6F96pNGSsSIvFJJoUS9WBl3ScSOXn1AXjezKQRMajKFC9xILjdGFBHarIQVgP4LWeFDzbxbs1XniGmH_WsRrtX3GB_mPu6L7JA-C06NbDs',
    User_API_KEY: 'J38YUp-iVcmkvOPu9584ReU3_jmYbupt51neV-q7yv844bwgwYeAwY5_2LJRyh89V9C92dtpe4Ct5M585EzdEpXKK6kNtQ68nfPuwV_G2-f8iou9J_eB8bBWdQ2h2ndCjZsAg23jgOBoKCPmxhgo1vKdYlG-mao2efIN7Lmguplkt1H7_920KnIdEe5x-OKnN93kbvbUzLiBRogXUOchJW1b7E22eIfeu7SzeJ8dOqvRJ6DBwIlVCd2d2XAs1asG6Jjtx06XNq-oGaLouApHWCmmCnETD-VrxBN3O2QitT_nVaQUsl91s7HDPH4LjYXyPox6k4-sh4V75Zj1LVC3IK3hvFqRj4iAR1oDczJLpo-StQfFe2VsjzlsfZFthMVBjXXRMYs_6JmgCnIi8p2Q-GyPb6y88vfuI1wVHT-MI8tU-1ZZKYPNVg',

    // Third-party tokens
    KIT_CLOSE_TASK_TOKEN: 'YOUR_KIT_TOKEN_HERE',

    // Supabase Configuration
    VITE_SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE',



};
