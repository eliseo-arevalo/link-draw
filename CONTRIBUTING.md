# Contributing Guide

Thanks for your interest in contributing to Excaligraph!

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

- Use the bug issue template
- Include detailed steps to reproduce the issue
- Include screenshots if possible
- Specify your environment (OS, browser version, etc.)

### Suggesting Enhancements

- Use the feature request issue template
- Clearly explain the problem it solves
- Provide usage examples
- Reference the PRD if relevant

### Pull Requests

1. Fork the repository
2. Create a branch from `main` (`git checkout -b feature/new-feature`)
3. Make your changes
4. Ensure tests pass
5. Commit your changes (`git commit -m 'feat: add new feature'`)
6. Push to the branch (`git push origin feature/new-feature`)
7. Open a Pull Request

## Development Process

### Environment Setup

```bash
# Clone the repository
git clone https://github.com/bug-devs/excaligraph.git
cd excaligraph

# Install dependencies
npm install
# or
pnpm install

# Configure environment variables
cp .env.example .env.local

# Run the project in development mode
npm run dev
```

### Branch Structure

- `main` - main branch, always stable
- `develop` - development branch
- `feature/*` - new features
- `bugfix/*` - bug fixes
- `hotfix/*` - urgent production fixes

## Code Standards

### Code Style

- Use ESLint and Prettier (configured in the project)
- Follow TypeScript/React best practices
- Write clean and self-documenting code
- Add comments for complex logic
- Use meaningful variable and function names

### Project-Specific Guidelines

#### React Components
- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use TypeScript for type safety

#### State Management
- Follow the established state management pattern
- Keep canvas state isolated
- Document complex state transformations

#### Excalidraw Integration
- Don't modify Excalidraw core
- Use the wrapper pattern for extensions
- Document any Excalidraw API usage

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add multi-canvas navigation
fix: resolve canvas state sync issue
docs: update README with setup instructions
style: format code according to ESLint
refactor: reorganize component structure
test: add tests for relationship manager
chore: update dependencies
```

### Tests

- Write tests for new features
- Ensure all tests pass before submitting PR
- Maintain code coverage above 80%

```bash
npm run test
npm run test:coverage
```

## Pull Request Process

1. **Update your branch** with the latest changes from `main`
2. **Run tests** and ensure they pass
3. **Update documentation** if necessary
4. **Describe your changes** clearly in the PR description
5. **Reference related issues** using `Closes #123`
6. **Wait for review** from at least one maintainer
7. **Address review comments** promptly

### PR Checklist

- [ ] Code follows the project's code standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code in hard-to-understand areas
- [ ] I have updated the corresponding documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] All existing and new unit tests pass locally
- [ ] Any dependent changes have been merged and published

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes
```

## Development Guidelines

### Working with Canvas State

- Always preserve Excalidraw state integrity
- Use the provided state management utilities
- Test canvas switching thoroughly
- Handle edge cases (empty canvas, large projects, etc.)

### Creating Relationships

- Validate element IDs before creating links
- Ensure bidirectional navigation works
- Add visual indicators that are clear but not intrusive
- Test with multiple canvas scenarios

### Storage Adapters

- Follow the adapter interface strictly
- Handle errors gracefully
- Add logging for debugging
- Write unit tests for each adapter

## Architecture Decisions

Before making significant architectural changes:

1. Open an issue for discussion
2. Reference the PRD (Product Requirements Document)
3. Get consensus from maintainers
4. Document the decision

## Questions?

If you have questions:
- Open an issue with the `question` label
- Check existing issues and discussions
- Review the PRD for project context

## Development Tips

### Debugging
```bash
# Run with debugging enabled
npm run dev:debug

# Check localStorage state
# Open DevTools -> Application -> Local Storage
```

### Performance
- Use React DevTools Profiler
- Monitor canvas switching performance (<100ms goal)
- Test with 50+ canvas projects

### Testing Locally
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

## First-Time Contributors

Good first issues are labeled with `good first issue`. These are typically:
- Documentation improvements
- Simple bug fixes
- UI/UX enhancements
- Test coverage improvements

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing! 🎉