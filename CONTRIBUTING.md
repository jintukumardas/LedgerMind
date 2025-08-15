# Contributing to LedgerMind

Thank you for your interest in contributing to LedgerMind! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and npm
- Git
- Foundry (for smart contract development)
- A Sei wallet with testnet SEI and USDC

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/ledgermind.git
   cd ledgermind
   ```

2. **Install Dependencies**
   ```bash
   npm install
   forge install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run Tests**
   ```bash
   npm run test
   ```

## 📁 Project Structure

```
ledgermind/
├── contracts/           # Solidity smart contracts
├── test/               # Foundry tests
├── packages/mcp/       # MCP server implementation
├── apps/web/          # Next.js frontend
├── script/            # Deployment scripts
└── docs/              # Documentation
```

## 🛠️ Development Workflow

### Smart Contracts

```bash
# Compile contracts
forge build

# Run tests
forge test -vv

# Deploy to testnet
forge script script/Deploy.s.sol --rpc-url $SEI_RPC_HTTP --private-key $PRIVATE_KEY_DEPLOYER --broadcast
```

### MCP Server

```bash
cd packages/mcp

# Development mode
npm run dev

# Build
npm run build

# Run indexer
npm run indexer
```

### Frontend

```bash
cd apps/web

# Development mode
npm run dev

# Build
npm run build
```

## 🧪 Testing

We maintain high test coverage across all components:

- **Smart Contracts**: Foundry tests with comprehensive coverage
- **MCP Server**: Jest unit tests
- **Frontend**: React Testing Library + Jest

### Running Tests

```bash
# All tests
npm run test

# Smart contracts only
npm run test:contracts

# MCP server only
npm run test:mcp

# Frontend only
npm run test:web
```

### Test Requirements

- All new features must include tests
- Maintain or improve test coverage
- Tests should be deterministic and fast
- Use descriptive test names

## 📝 Code Style

### General Guidelines

- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Write clear, self-documenting code
- Add comments for complex logic

### Smart Contracts

- Follow Solidity style guide
- Use OpenZeppelin libraries when possible
- Include comprehensive NatSpec documentation
- Prefer explicit over implicit

### TypeScript/JavaScript

- Use ESLint and Prettier configurations
- Prefer functional programming patterns
- Use proper error handling
- Type everything explicitly

## 🔍 Code Review Process

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Pull Request Guidelines

- **Clear Title**: Describe what the PR does
- **Description**: Explain the changes and reasoning
- **Link Issues**: Reference related issues
- **Tests**: Include tests for new functionality
- **Documentation**: Update relevant documentation

### Review Criteria

- ✅ Code follows style guidelines
- ✅ Tests pass and coverage is maintained
- ✅ Documentation is updated
- ✅ No security vulnerabilities
- ✅ Performance considerations addressed

## 🐛 Bug Reports

When reporting bugs, please include:

- **Environment**: OS, Node.js version, browser
- **Steps to Reproduce**: Clear, step-by-step instructions
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Error Messages**: Complete error messages and stack traces

Use the bug report template:

```markdown
## Bug Description
A clear description of the bug.

## To Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Environment
- OS: [e.g., macOS 12.0]
- Node.js: [e.g., 20.11.0]
- Browser: [e.g., Chrome 120.0]

## Additional Context
Any other context about the problem.
```

## 💡 Feature Requests

We welcome feature requests! Please:

- **Check existing issues** to avoid duplicates
- **Provide context** about the use case
- **Describe the solution** you'd like to see
- **Consider alternatives** you've thought about

Use the feature request template:

```markdown
## Feature Description
A clear description of the feature you'd like to see.

## Use Case
Describe the problem this feature would solve.

## Proposed Solution
Describe how you think this should work.

## Alternatives Considered
Other approaches you've considered.

## Additional Context
Any other context or screenshots.
```

## 🔐 Security

### Reporting Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email us at: security@ledgermind.ai

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Guidelines

- Never commit private keys or secrets
- Use environment variables for sensitive data
- Follow smart contract security best practices
- Keep dependencies updated

## 📚 Documentation

### Types of Documentation

- **README**: Project overview and setup
- **API Documentation**: MCP tools and endpoints
- **Smart Contract Documentation**: NatSpec and interfaces
- **User Guides**: How to use the application
- **Developer Guides**: Technical implementation details

### Documentation Standards

- Use clear, simple language
- Include code examples
- Keep documentation up-to-date
- Use proper markdown formatting

## 🏷️ Issue Labels

We use labels to categorize issues:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to docs
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority-high`: Critical issues
- `priority-low`: Nice to have
- `smart-contracts`: Related to Solidity code
- `mcp-server`: Related to MCP implementation
- `frontend`: Related to Next.js app

## 🎯 Development Priorities

Current focus areas:

1. **Core Functionality**: Payment intent creation and execution
2. **Security**: Smart contract auditing and testing
3. **UX/UI**: Frontend dashboard improvements
4. **Integration**: MCP tools and AI agent compatibility
5. **Documentation**: Comprehensive guides and examples

## 💬 Communication

- **Discord**: [Join our community](https://discord.gg/ledgermind)
- **Twitter**: [@LedgerMindAI](https://twitter.com/LedgerMindAI)
- **Email**: team@ledgermind.ai

## 📄 License

By contributing to LedgerMind, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be:
- Listed in the project README
- Mentioned in release notes
- Invited to contributor channels
- Eligible for contributor NFTs (coming soon)

---

Thank you for contributing to LedgerMind! Together, we're building the future of AI agent commerce. 🚀