import json
import re
from typing import Dict, Any, List
from app.schemas.github_schema import GitHubAnalysisRequest, DetectedStack

class StaticAnalyzer:
    def analyze(self, request: GitHubAnalysisRequest) -> Dict[str, Any]:
        file_tree = request.fileTree or []
        readme = request.readme or ""
        important_files = {f.path: f.content for f in (request.importantFiles or [])}
        config_files = {f.path: f.content for f in (request.configurationFiles or [])}
        all_files = {**config_files, **important_files}

        # 1. Tech Stack Detection
        stack = self._detect_stack(request, file_tree, config_files, all_files)

        # 2. Category Evidence & Signals
        doc_signals = self._analyze_documentation(readme, file_tree)
        testing_signals = self._analyze_testing(file_tree, config_files)
        security_signals = self._analyze_security(file_tree, all_files)
        error_signals = self._analyze_error_handling(all_files)
        structure_signals = self._analyze_structure(file_tree)
        devops_signals = self._analyze_devops(file_tree)
        hygiene_signals = self._analyze_hygiene(file_tree, config_files)

        return {
            "stack": stack,
            "documentation": doc_signals,
            "testing": testing_signals,
            "security": security_signals,
            "errorHandling": error_signals,
            "structure": structure_signals,
            "devops": devops_signals,
            "hygiene": hygiene_signals
        }

    def _detect_stack(
        self, request: GitHubAnalysisRequest, file_tree: List[str],
        config_files: Dict[str, str], all_files: Dict[str, str]
    ) -> DetectedStack:
        languages = set()
        frameworks = set()
        databases = set()
        tools = set()

        if request.repository.primaryLanguage:
            languages.add(request.repository.primaryLanguage)

        for lang, bytes_count in (request.repository.languages or {}).items():
            languages.add(lang)

        # Check Node.js / JavaScript / TypeScript manifest
        pkg_content = config_files.get("package.json")
        if pkg_content:
            languages.add("JavaScript")
            try:
                pkg_data = json.loads(pkg_content)
                deps = {
                    **pkg_data.get("dependencies", {}),
                    **pkg_data.get("devDependencies", {})
                }

                if "express" in deps:
                    frameworks.add("Express.js")
                if "react" in deps:
                    frameworks.add("React")
                if "next" in deps:
                    frameworks.add("Next.js")
                if "vue" in deps:
                    frameworks.add("Vue.js")
                if "nest" in deps or "@nestjs/core" in deps:
                    frameworks.add("NestJS")
                if "typescript" in deps:
                    languages.add("TypeScript")

                if "mongoose" in deps or "mongodb" in deps:
                    databases.add("MongoDB")
                if "pg" in deps or "sequelize" in deps or "prisma" in deps:
                    databases.add("PostgreSQL")
                if "mysql" in deps or "mysql2" in deps:
                    databases.add("MySQL")
                if "redis" in deps or "ioredis" in deps:
                    databases.add("Redis")

                if "jsonwebtoken" in deps:
                    tools.add("JWT")
                if "bcrypt" in deps or "bcryptjs" in deps:
                    tools.add("Bcrypt")
                if "docker" in file_tree:
                    tools.add("Docker")
                if "jest" in deps or "mocha" in deps or "vitest" in deps:
                    tools.add("Testing Framework")
            except Exception:
                pass

        # Check Python manifest
        reqs_content = config_files.get("requirements.txt", "") + "\n" + config_files.get("pyproject.toml", "")
        if reqs_content.strip():
            languages.add("Python")
            if "fastapi" in reqs_content.lower():
                frameworks.add("FastAPI")
            if "django" in reqs_content.lower():
                frameworks.add("Django")
            if "flask" in reqs_content.lower():
                frameworks.add("Flask")

            if "pymongo" in reqs_content.lower() or "motor" in reqs_content.lower():
                databases.add("MongoDB")
            if "psycopg" in reqs_content.lower() or "sqlalchemy" in reqs_content.lower():
                databases.add("PostgreSQL")
            if "redis" in reqs_content.lower():
                databases.add("Redis")

            if "pydantic" in reqs_content.lower():
                tools.add("Pydantic")
            if "pytest" in reqs_content.lower():
                tools.add("Pytest")

        confidence = 0.95 if (pkg_content or reqs_content.strip()) else 0.70

        return DetectedStack(
            languages=sorted(list(languages)),
            frameworks=sorted(list(frameworks)),
            databases=sorted(list(databases)),
            tools=sorted(list(tools)),
            confidence=confidence
        )

    def _analyze_documentation(self, readme: str, file_tree: List[str]) -> Dict[str, Any]:
        has_readme = bool(readme and len(readme.strip()) > 50)
        has_install = bool(re.search(r'install|getting started|setup', readme, re.I)) if has_readme else False
        has_usage = bool(re.search(r'usage|example|run|start', readme, re.I)) if has_readme else False
        has_env_doc = bool(re.search(r'env|environment|secret|config', readme, re.I)) if has_readme else False

        evidence = []
        if has_readme:
            evidence.append("README.md exists")
        if has_install:
            evidence.append("Installation section found in README")
        if has_usage:
            evidence.append("Usage section found in README")
        if has_env_doc:
            evidence.append("Environment variable setup documented")

        score = 0
        if has_readme: score += 40
        if has_install: score += 20
        if has_usage: score += 20
        if has_env_doc: score += 20

        return {"score": min(100, score), "evidence": evidence, "hasReadme": has_readme}

    def _analyze_testing(self, file_tree: List[str], config_files: Dict[str, str]) -> Dict[str, Any]:
        test_files = [f for f in file_tree if "test" in f.lower() or "spec" in f.lower()]
        has_test_folder = any("test" in f.lower() for f in file_tree)
        
        score = 0
        evidence = []
        if test_files:
            score += 60
            evidence.append(f"Found {len(test_files)} test files (e.g. {test_files[0]})")
        if has_test_folder:
            score += 20
            evidence.append("Dedicated test directory present")

        # Check for test scripts in package.json
        pkg_content = config_files.get("package.json")
        if pkg_content:
            try:
                pkg_data = json.loads(pkg_content)
                scripts = pkg_data.get("scripts", {})
                if "test" in scripts and scripts["test"] != 'echo "Error: no test specified" && exit 1':
                    score += 20
                    evidence.append("Valid test script configured in package.json")
            except Exception:
                pass

        return {"score": min(100, score), "evidence": evidence, "testFiles": test_files}

    def _analyze_security(self, file_tree: List[str], all_files: Dict[str, str]) -> Dict[str, Any]:
        evidence = []
        issues = []
        score = 80

        # Check for committed .env file
        committed_env = [f for f in file_tree if f == ".env" or f.endswith("/.env")]
        if committed_env:
            score -= 40
            issues.append(f"Hardcoded .env file committed to repository ({committed_env[0]})")

        # Check for auth middleware & rate limiting
        has_auth_middleware = any("auth" in path.lower() or "jwt" in path.lower() for path in file_tree)
        has_rate_limit = False
        has_cors = False

        for path, content in all_files.items():
            if "rate-limit" in content.lower() or "ratelimit" in content.lower():
                has_rate_limit = True
            if "cors" in content.lower():
                has_cors = True
            # Check for suspicious secret strings
            if re.search(r'secret\s*=\s*["\'][a-zA-Z0-9_-]{8,}["\']', content):
                issues.append(f"Potential hardcoded secret key string in {path}")
                score -= 15

        if has_auth_middleware:
            evidence.append("Authentication middleware/module detected")
            score += 10
        if has_rate_limit:
            evidence.append("Rate limiting middleware detected")
            score += 10
        if has_cors:
            evidence.append("CORS security middleware detected")

        return {"score": max(0, min(100, score)), "evidence": evidence, "issues": issues}

    def _analyze_error_handling(self, all_files: Dict[str, str]) -> Dict[str, Any]:
        try_catch_count = 0
        centralized_error = False
        evidence = []

        for path, content in all_files.items():
            try_catch_count += len(re.findall(r'try\s*\{', content))
            if "errorhandler" in path.lower() or "error.js" in path.lower() or "middleware/error" in path.lower():
                centralized_error = True

        score = 40
        if try_catch_count > 0:
            score += 40
            evidence.append(f"Found {try_catch_count} try/catch exception handlers across files")
        if centralized_error:
            score += 20
            evidence.append("Centralized error handling middleware detected")

        return {"score": min(100, score), "evidence": evidence}

    def _analyze_structure(self, file_tree: List[str]) -> Dict[str, Any]:
        has_controllers = any("/controller" in f.lower() or "controllers/" in f.lower() for f in file_tree)
        has_services = any("/service" in f.lower() or "services/" in f.lower() for f in file_tree)
        has_models = any("/model" in f.lower() or "models/" in f.lower() or "/schemas" in f.lower() for f in file_tree)
        has_routes = any("/route" in f.lower() or "routes/" in f.lower() or "/router" in f.lower() for f in file_tree)

        evidence = []
        score = 50
        if has_controllers:
            score += 15
            evidence.append("Controllers layer structured")
        if has_services:
            score += 15
            evidence.append("Services layer structured")
        if has_models:
            score += 10
            evidence.append("Data Models/Schemas structured")
        if has_routes:
            score += 10
            evidence.append("Routes/Router layer structured")

        return {"score": min(100, score), "evidence": evidence}

    def _analyze_devops(self, file_tree: List[str]) -> Dict[str, Any]:
        has_docker = any("dockerfile" in f.lower() for f in file_tree)
        has_docker_compose = any("docker-compose" in f.lower() for f in file_tree)
        has_actions = any(".github/workflows" in f.lower() for f in file_tree)

        evidence = []
        score = 30
        if has_docker:
            score += 35
            evidence.append("Dockerfile present for containerization")
        if has_docker_compose:
            score += 20
            evidence.append("docker-compose setup present for multi-container orchestration")
        if has_actions:
            score += 15
            evidence.append("GitHub Actions CI/CD workflows configured")

        return {"score": min(100, score), "evidence": evidence}

    def _analyze_hygiene(self, file_tree: List[str], config_files: Dict[str, str]) -> Dict[str, Any]:
        has_gitignore = any(".gitignore" in f for f in file_tree)
        has_manifest = any(m in f for f in file_tree for m in ["package.json", "requirements.txt", "pyproject.toml", "pom.xml"])
        
        evidence = []
        score = 50
        if has_gitignore:
            score += 25
            evidence.append(".gitignore file present")
        if has_manifest:
            score += 25
            evidence.append("Dependency manifest present")

        return {"score": min(100, score), "evidence": evidence}

static_analyzer = StaticAnalyzer()
