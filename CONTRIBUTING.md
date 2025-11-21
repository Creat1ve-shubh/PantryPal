# Contributing to PantryPal

Thank you for your interest in contributing! This guide will help you get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL or Neon account
- Git installed and configured
- Code editor (VS Code recommended)

### Fork and Clone

```bash
# Fork repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/PantryPal.git
cd PantryPal
git remote add upstream https://github.com/Creat1ve-shubh/PantryPal.git
```

### Setup Development Environment

```bash
npm install
cp .env.docker .env
# Edit .env with your database credentials
npm run db:push
npx tsx server/scripts/seed-rbac.ts
npm run dev
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation if needed

### 3. Test Locally

```bash
npm run check           # Type checking
npm run build           # Production build test
npm run dev             # Manual testing
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add user profile page"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

---

## Coding Standards

### TypeScript

- Use strict type checking
- Avoid `any` types (use `unknown` if needed)
- Define interfaces for data structures
- Use enums for fixed value sets

```typescript
// Good
interface User {
  id: number;
  email: string;
  role: UserRole;
}

// Avoid
const user: any = { ... };
```

### React Components

- Use functional components with hooks
- Destructure props for clarity
- Keep components focused and small
- Use TypeScript for prop types

```tsx
// Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ label, onClick, variant = "primary" }: ButtonProps) {
  return (
    <button onClick={onClick} className={variant}>
      {label}
    </button>
  );
}
```

### File Naming

- Components: PascalCase (`UserProfile.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Hooks: camelCase with `use` prefix (`useAuth.ts`)
- Pages: PascalCase (`Dashboard.tsx`)

### Code Organization

- Group related imports together
- Destructure imports when possible
- Keep files under 300 lines (split if larger)
- Use barrel exports (`index.ts`) for modules

---

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code restructuring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(auth): add password reset functionality

fix(inventory): correct stock calculation for expired products

docs(readme): update installation instructions

refactor(api): simplify error handling middleware

test(auth): add unit tests for login controller
```

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] TypeScript type checks pass (`npm run check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual testing completed
- [ ] Documentation updated (if needed)
- [ ] Commits follow conventional format

### PR Description Template

```markdown
## Description

Brief summary of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How to test these changes

## Screenshots (if applicable)

## Checklist

- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Your contribution will be credited in release notes

---

## Testing

### Unit Tests (Planned)

```bash
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- auth.test.ts    # Specific test
```

### Manual Testing Checklist

- [ ] Feature works as expected
- [ ] No console errors
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Browser compatibility (Chrome, Firefox, Safari)
- [ ] Edge cases handled
- [ ] Error messages are clear

---

## Documentation

### When to Update Docs

- New features or API endpoints
- Changed behavior
- New environment variables
- Setup process changes
- Architecture modifications

### Documentation Files

- `README.md` - Project overview (keep concise)
- `SETUP.md` - Installation and configuration
- `ARCHITECTURE.md` - Technical details
- `docs/` - Extended guides (auth, security, etc.)
- Code comments - Complex logic explanation

### Documentation Style

- Use clear, simple language
- Provide code examples
- Include error troubleshooting
- Add diagrams for complex flows
- Keep formatting consistent

---

## Issue Reporting

### Bug Reports

Include:

- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, browser)
- Screenshots or error logs

### Feature Requests

Include:

- Problem statement (what and why)
- Proposed solution
- Alternative solutions considered
- Impact on existing features

---

## Questions?

- Open an issue for questions
- Check existing issues first
- Join discussions on GitHub
- Contact maintainers: [Issues Page](https://github.com/Creat1ve-shubh/PantryPal/issues)

---

## Recognition

Contributors will be:

- Listed in release notes
- Added to GitHub contributors
- Credited in project documentation

Thank you for contributing to PantryPal! 🎉

---

[← Back to Main README](./README.md)
