# Version Update Prompt

## Context

This repository contains two main components that require synchronized version updates:

1. Auto-Git CLI (`/package.json`) - AI-powered Git automation tool
2. GitCue VS Code Extension (`/gitcue/package.json`) - Enhanced interactive sidebar extension

Both components share the same version number and must be updated atomically to maintain consistency across the ecosystem.

## Objective

Update version numbers across all relevant files in the repository while maintaining semantic versioning standards and ensuring documentation is properly updated.

## Version Files to Update

### Primary Version Files
- `/package.json` - Root package for Auto-Git CLI
- `/gitcue/package.json` - GitCue VS Code extension package

### Documentation Files
- `/README.md` - Main documentation (update version badges and references)
- `/gitcue/README.md` - GitCue extension documentation (update version badges)
- `/CHANGELOG.md` - Root changelog (add new version entry)
- `/gitcue/CHANGELOG.md` - GitCue changelog (add new version entry)

### Additional Version References
- Check for hardcoded version strings in source files
- Update any installation examples with version numbers
- Verify VS Code marketplace version references

## Semantic Versioning Rules

Follow semantic versioning (SemVer) format: MAJOR.MINOR.PATCH

### Version Increment Guidelines

**MAJOR version** (X.0.0) - Increment when:
- Making incompatible API changes
- Breaking changes to CLI commands or arguments
- Removing deprecated features
- Major architectural refactoring affecting public interfaces
- Changes requiring user migration or configuration updates

**MINOR version** (x.Y.0) - Increment when:
- Adding new features in a backward-compatible manner
- Adding new commands or options
- Enhancing existing functionality without breaking changes
- Adding new AI capabilities or commit modes
- Improving performance significantly

**PATCH version** (x.y.Z) - Increment when:
- Bug fixes and error corrections
- Documentation updates
- Performance improvements (minor)
- Internal refactoring without API changes
- Dependency updates

## Requirements

### Version Update Checklist

1. Determine the correct version increment type (MAJOR, MINOR, or PATCH)
2. Update version in all package.json files atomically
3. Update version references in README files
4. Add comprehensive changelog entry with categorized changes
5. Update any version badges or shields
6. Verify all version strings are consistent
7. Check for hardcoded version references in code
8. Update installation examples if necessary

### Changelog Entry Format

Use the following structure for changelog entries:

```markdown
## vX.Y.Z - YYYY-MM-DD

### Added
- New features and capabilities
- New commands or options
- New AI integrations

### Changed
- Modifications to existing features
- Behavioral changes
- Performance improvements

### Fixed
- Bug fixes
- Error corrections
- Security patches

### Removed
- Deprecated features
- Removed functionality

### Security
- Security-related changes
- Vulnerability patches
```

### Badge Format for READMEs

Ensure version badges follow this format:
```markdown
[![npm version](https://badge.fury.io/js/@sbeeredd04%2Fauto-git.svg)](https://badge.fury.io/js/@sbeeredd04%2Fauto-git)
[![Version](https://img.shields.io/badge/version-X.Y.Z-blue.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)
```

## Guidelines

### Best Practices

1. **Atomic Updates**: All version changes must be completed in a single commit
2. **Version Consistency**: Ensure both package.json files have identical versions
3. **Changelog First**: Write changelog entry before updating version numbers
4. **Testing**: Verify changes do not break existing functionality
5. **Documentation**: Update all user-facing documentation with new version
6. **No Emoji**: Do not use emojis in version update commits or changelogs
7. **Clear Descriptions**: Provide detailed explanations for all changes

### Commit Message Format

Use conventional commit format for version updates:

```
chore(release): bump version to X.Y.Z

- Updated package.json to version X.Y.Z
- Updated gitcue/package.json to version X.Y.Z
- Added changelog entry for vX.Y.Z
- Updated README badges and documentation
- [Additional changes if any]
```

### Pre-Update Validation

Before updating versions, verify:
- All tests pass (if applicable)
- Documentation is current
- No pending critical bugs
- All new features are documented
- Dependencies are up to date
- No security vulnerabilities

### Post-Update Actions

After version update:
- Create git tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
- Verify package builds correctly
- Test installation from npm
- Update GitHub releases
- Publish to npm registry
- Publish to VS Code Marketplace

## Output Format

### Version Update Summary

Provide a structured summary after version update:

```
Version Update Summary
=====================

Previous Version: X.Y.Z
New Version: A.B.C
Update Type: [MAJOR|MINOR|PATCH]

Files Modified:
- package.json
- gitcue/package.json
- README.md
- gitcue/README.md
- CHANGELOG.md
- gitcue/CHANGELOG.md

Changes Summary:
[Brief description of what changed]

Breaking Changes: [Yes/No]
[If yes, list breaking changes]

Migration Required: [Yes/No]
[If yes, provide migration steps]

Next Steps:
1. Review changes
2. Run tests
3. Build and verify
4. Create release tag
5. Publish to npm
6. Publish to VS Code Marketplace
```

## Validation Steps

After completing version update:

1. Verify all package.json files have matching versions
2. Confirm changelog entries are complete and accurate
3. Check all README badges display correct version
4. Search codebase for any missed version references
5. Ensure commit message follows conventional format
6. Validate no broken links in documentation
7. Confirm all files are properly formatted

## Error Handling

If version update fails:

1. Do not commit partial changes
2. Rollback all version modifications
3. Document the failure reason
4. Fix underlying issues
5. Retry version update process
6. Verify all files are consistent

## Notes

- Version updates should be done on the main branch
- Always increment from the current published version
- Never skip version numbers
- Pre-release versions use format: X.Y.Z-alpha.N or X.Y.Z-beta.N
- Development versions use format: X.Y.Z-dev
- Version 4.0.0 was the last major release for Auto-Git
- Version 0.4.0 was the last release for GitCue extension
- Maintain parallel versioning strategy for CLI and extension
