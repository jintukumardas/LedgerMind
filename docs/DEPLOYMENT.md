# Deployment Guide

This guide covers deploying LedgerMind to production environments.

## 🚀 Quick Deploy

### 1. Fork Repository
Fork the [LedgerMind repository](https://github.com/your-org/ledgermind) to your GitHub account.

### 2. Deploy Smart Contracts

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Clone your fork
git clone https://github.com/your-username/ledgermind.git
cd ledgermind

# Set up environment
cp .env.example .env
# Edit .env with your private keys and configuration

# Deploy to Sei testnet
forge script script/Deploy.s.sol \
  --rpc-url https://rpc-evm-atlantic-2.seitrace.com \
  --private-key $PRIVATE_KEY_DEPLOYER \
  --broadcast \
  --verify
```

### 3. Deploy Frontend to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ledgermind&project-name=ledgermind&framework=nextjs&root-directory=apps/web)

1. **Connect Repository**: Import your forked repository
2. **Configure Build Settings**:
   - Framework: Next.js
   - Root Directory: `apps/web`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. **Set Environment Variables**:
   ```
   NEXT_PUBLIC_CHAIN_ID=1328
   NEXT_PUBLIC_RPC_URL=https://rpc-evm-atlantic-2.seitrace.com
   NEXT_PUBLIC_FACTORY_ADDRESS=your_deployed_factory_address
   NEXT_PUBLIC_USDC_ADDRESS=0x4fCF1784B31630811181f670Aea7A7bEF803eaED
   ```

4. **Deploy**: Click "Deploy" and wait for the build to complete

### 4. Deploy MCP Server

#### Option A: Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)

1. **Connect Repository**: Link your GitHub repository
2. **Configure Service**:
   - Root Directory: `packages/mcp`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Set Environment Variables**:
   ```
   SEI_RPC_HTTP=https://rpc-evm-atlantic-2.seitrace.com
   SEI_CHAIN_ID=1328
   FACTORY_ADDRESS=your_deployed_factory_address
   USDC_ADDRESS=0x4fCF1784B31630811181f670Aea7A7bEF803eaED
   PRIVATE_KEY_PAYER=your_payer_private_key
   PRIVATE_KEY_AGENT=your_agent_private_key
   ```

#### Option B: Render

1. **Create Web Service**: Connect your GitHub repository
2. **Configure Build**:
   - Root Directory: `packages/mcp`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Environment Variables**: Same as Railway above

#### Option C: Digital Ocean App Platform

```yaml
# .do/app.yaml
name: ledgermind-mcp
services:
- name: mcp-server
  source_dir: packages/mcp
  github:
    repo: your-username/ledgermind
    branch: main
  run_command: npm start
  build_command: npm install && npm run build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: SEI_RPC_HTTP
    value: https://rpc-evm-atlantic-2.seitrace.com
  - key: FACTORY_ADDRESS
    value: your_deployed_factory_address
```

## 🔧 Advanced Configuration

### Environment Variables

#### Smart Contracts
```bash
# Required
SEI_RPC_HTTP=https://rpc-evm-atlantic-2.seitrace.com
SEI_CHAIN_ID=1328
PRIVATE_KEY_DEPLOYER=your_deployer_private_key

# For mainnet
SEI_MAINNET_RPC=https://evm-rpc.sei-apis.com
SEI_MAINNET_CHAIN_ID=1329
```

#### MCP Server
```bash
# Required
SEI_RPC_HTTP=https://rpc-evm-atlantic-2.seitrace.com
SEI_CHAIN_ID=1328
FACTORY_ADDRESS=your_deployed_factory_address
USDC_ADDRESS=0x4fCF1784B31630811181f670Aea7A7bEF803eaED
PRIVATE_KEY_PAYER=your_payer_private_key
PRIVATE_KEY_AGENT=your_agent_private_key

# Optional: IPFS
IPFS_API_URL=https://ipfs.infura.io:5001
IPFS_API_KEY=your_infura_project_id
IPFS_API_SECRET=your_infura_secret

# Optional: Database
DATABASE_URL=postgresql://user:password@host:port/database

# Optional: GOAT SDK
GOAT_API_KEY=your_crossmint_api_key
```

#### Frontend
```bash
# Required
NEXT_PUBLIC_CHAIN_ID=1328
NEXT_PUBLIC_RPC_URL=https://rpc-evm-atlantic-2.seitrace.com
NEXT_PUBLIC_FACTORY_ADDRESS=your_deployed_factory_address
NEXT_PUBLIC_USDC_ADDRESS=0x4fCF1784B31630811181f670Aea7A7bEF803eaED

# Optional
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
```

### Database Setup

#### PostgreSQL (for MCP Server indexer)

```bash
# Using Docker
docker run -d \
  --name ledgermind-postgres \
  -e POSTGRES_DB=ledgermind \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  postgres:15

# Or use managed services:
# - Railway PostgreSQL
# - Render PostgreSQL  
# - Supabase
# - AWS RDS
```

### Custom Domain

#### Vercel
1. Go to your project settings
2. Add your custom domain
3. Configure DNS records:
   ```
   Type: CNAME
   Name: your-domain.com
   Value: cname.vercel-dns.com
   ```

#### Cloudflare (recommended)
1. Add your domain to Cloudflare
2. Set up DNS records
3. Enable SSL/TLS encryption
4. Configure security settings

## 📊 Monitoring & Analytics

### Error Tracking
```bash
# Sentry (recommended)
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project

# LogRocket (for frontend)
NEXT_PUBLIC_LOGROCKET_APP_ID=your_logrocket_app_id
```

### Analytics
```bash
# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Mixpanel
NEXT_PUBLIC_MIXPANEL_TOKEN=your_mixpanel_token
```

### Uptime Monitoring
- [UptimeRobot](https://uptimerobot.com/)
- [Pingdom](https://www.pingdom.com/)
- [StatusPage](https://www.statuspage.io/)

## 🔐 Security Considerations

### Private Key Management
```bash
# Use environment variables, never commit keys
PRIVATE_KEY_DEPLOYER=your_key_here

# For production, use:
# - AWS Secrets Manager
# - HashiCorp Vault
# - Railway/Render encrypted environment variables
```

### Smart Contract Verification
```bash
# Verify on SeiTrace
forge verify-contract \
  --chain-id 1328 \
  --compiler-version 0.8.26 \
  --constructor-args $(cast abi-encode "constructor()") \
  0xYourContractAddress \
  contracts/PaymentIntentFactory.sol:PaymentIntentFactory \
  --etherscan-api-key $SEI_ETHERSCAN_API_KEY
```

### Security Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## 🚀 Production Checklist

- [ ] **Smart Contracts**
  - [ ] Deployed to Sei testnet/mainnet
  - [ ] Verified on SeiTrace
  - [ ] Security audit completed
  - [ ] Gas optimizations applied

- [ ] **MCP Server**
  - [ ] Deployed to production hosting
  - [ ] Environment variables configured
  - [ ] Database connected and migrated
  - [ ] Monitoring and logging enabled

- [ ] **Frontend**
  - [ ] Deployed to Vercel/Netlify
  - [ ] Custom domain configured
  - [ ] SSL certificate active
  - [ ] Analytics and error tracking enabled

- [ ] **Security**
  - [ ] Private keys secured
  - [ ] Security headers configured
  - [ ] HTTPS enforced
  - [ ] CORS properly configured

- [ ] **Performance**
  - [ ] CDN configured
  - [ ] Images optimized
  - [ ] Caching strategies implemented
  - [ ] Core Web Vitals optimized

- [ ] **Documentation**
  - [ ] Deployment guide updated
  - [ ] API documentation complete
  - [ ] User guides available
  - [ ] Support channels established

## 🛠️ Troubleshooting

### Common Issues

#### Smart Contract Deployment
```bash
# Gas estimation failed
forge script script/Deploy.s.sol --gas-estimate-multiplier 200

# Network connection timeout
forge script script/Deploy.s.sol --slow --timeout 60000

# Contract verification failed
forge verify-contract --help
```

#### Frontend Build Errors
```bash
# Memory issues
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Next.js cache issues
rm -rf .next && npm run build

# Environment variable issues
cat .env.local  # Check if variables are set correctly
```

#### MCP Server Issues
```bash
# Database connection
npm run indexer  # Test database connectivity

# Blockchain RPC issues
curl -X POST https://rpc-evm-atlantic-2.seitrace.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Getting Help

- **GitHub Issues**: [Report bugs and issues](https://github.com/your-org/ledgermind/issues)
- **Discord**: [Join our community](https://discord.gg/ledgermind)
- **Email**: team@ledgermind.ai

---

## 📱 Mobile Considerations

### Progressive Web App
```json
// public/manifest.json
{
  "name": "LedgerMind",
  "short_name": "LedgerMind",
  "description": "AI Agent Payment Intents",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#D40E2B",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

Congratulations! Your LedgerMind deployment should now be live and ready for users. 🎉