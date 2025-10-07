# Contributing to Auto-Git

Thank you for your interest in contributing to Auto-Git! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/auto-git.git
   cd auto-git
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Link for testing**:
   ```bash
   npm link
   ```
5. **Set up your API key** for testing:
   ```bash
   export GEMINI_API_KEY="your-test-key"
   ```

## 🛠️ Development Setup

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- Git
- Google Gemini API key (for testing)

### Project Structure
```
auto-git/
├── bin/auto-git.js      # CLI entrypoint
├── lib/
│   ├── config.js        # Configuration management
│   ├── gemini.js        # Gemini API integration  
│   ├── git.js           # Git operations
│   └── watcher.js       # File watching logic
├── .github/workflows/   # GitHub Actions
├── package.json
├── README.md
└── CHANGELOG.md
```

### Testing Your Changes

1. **Manual Testing**:
   ```bash
   auto-git config          # Test configuration
   auto-git commit --dry-run # Test commit generation (when implemented)
   auto-git --help          # Test CLI help
   ```

2. **Test in a Safe Repository**:
   - Create a test git repository
   - Make some changes
   - Test `auto-git commit` and `auto-git watch`

## 📝 Contribution Guidelines

### Code Style

- Use **ES modules** (import/export)
- Follow **conventional commit** format for commit messages
- Use **async/await** for asynchronous operations
- Add **JSDoc comments** for functions
- Keep functions **small and focused**

### Commit Message Format

Use conventional commits:
```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(cli): add dry-run option for commit command`
- `fix(gemini): handle API rate limiting`  
- `docs(readme): update installation instructions`
- `refactor(git): simplify diff parsing logic`

### Branch Naming

- `feature/description` - for new features
- `fix/description` - for bug fixes
- `docs/description` - for documentation changes
- `refactor/description` - for code refactoring

## 🎯 How to Contribute

### 1. Reporting Issues

Before creating an issue:
- Check if the issue already exists
- Include relevant system information (OS, Node.js version)
- Provide steps to reproduce the problem
- Include error messages and logs

Use these labels:
- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `help wanted` - Extra attention needed

### 2. Suggesting Features

For feature requests:
- Explain the use case and motivation
- Provide examples of how it would work
- Consider backwards compatibility
- Discuss implementation approach

### 3. Code Contributions

1. **Create an issue** first to discuss the change
2. **Fork and clone** the repository
3. **Create a feature branch**: `git checkout -b feature/your-feature`
4. **Make your changes** with tests
5. **Test thoroughly** in different scenarios
6. **Update documentation** if needed
7. **Commit with conventional format**
8. **Push and create a Pull Request**

### Pull Request Process

1. **Ensure CI passes** (GitHub Actions)
2. **Update CHANGELOG.md** for notable changes
3. **Add/update tests** if applicable
4. **Update documentation** for new features
5. **Request review** from maintainers

## 🧪 Testing

### Manual Testing Checklist

- [ ] CLI commands work correctly
- [ ] Configuration loading works
- [ ] Gemini API integration works
- [ ] File watching functions properly
- [ ] Git operations execute successfully
- [ ] Error handling works as expected
- [ ] Cross-platform compatibility (if possible)

### Test Scenarios

1. **First-time setup**:
   - No API key configured
   - Invalid API key
   - Valid API key setup

2. **Git scenarios**:
   - Repository with remote
   - Repository without remote
   - Repository with uncommitted changes
   - Repository with no changes

3. **Configuration**:
   - Environment variables
   - User config file
   - Project .env file

## 📚 Documentation

When contributing documentation:

- Use clear, concise language
- Include practical examples
- Update both README.md and inline docs
- Test all code examples
- Consider different user skill levels

## 🐛 Debugging

### Common Issues

1. **API Key Problems**:
   ```bash
   auto-git config  # Check if API key is set
   ```

2. **Git Repository Issues**:
   ```bash
   git status       # Check repository state
   git remote -v    # Check remote configuration
   ```

3. **File Watching Issues**:
   - Check file permissions
   - Verify watch paths exist
   - Test with simple file changes

### Debug Mode

Enable verbose logging (when implemented):
```bash
DEBUG=auto-git* auto-git watch
```

## 🚀 Release Process

For maintainers:

1. **Update version** in package.json
2. **Update CHANGELOG.md** with changes
3. **Create GitHub release** with tag
4. **GitHub Actions** will automatically publish to npm

## 📞 Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Email**: Contact maintainers directly for security issues

## 🏆 Recognition

Contributors will be:
- Listed in the README.md contributors section
- Mentioned in release notes for significant contributions
- Invited to be maintainers for ongoing contributions

## 📄 License

By contributing to Auto-Git, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Auto-Git! 🎉 