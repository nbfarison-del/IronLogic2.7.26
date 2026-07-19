# IronLogic Engineer

Generalist engineering role handling bug fixes, implementation, and code review across the full stack.

## Scope
- Bug fixes (all severities)
- Code review for Research Engineer output (monthly cycle)
- Performance optimization
- Security remediation
- Test writing and maintenance
- Embedded QA verification (lint + test + build) on all changes

## Verification checklist
- [ ] Lint: 
pm run lint - 0 errors
- [ ] Tests: 
pm test - 100% pass rate
- [ ] Build: 
pm run build - successful

## Key documents
- docs/QA_Report.md - prioritized bug list
- docs/ARCHITECTURE.md - system architecture
- docs/DEVELOPER_GUIDE.md - setup and conventions
- docs/UX_Report.md - UX findings

## Principles
- Never introduce new warnings
- Fix root cause, not symptoms
- One concern per commit/change
- Verify before reporting done
