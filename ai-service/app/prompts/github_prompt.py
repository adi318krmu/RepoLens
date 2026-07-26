from typing import Dict, Any, List
from app.schemas.github_schema import GitHubAnalysisRequest

def build_github_analysis_prompt(request: GitHubAnalysisRequest, static_signals: Dict[str, Any]) -> str:
    repo = request.repository
    readme = request.readme or "No README provided"
    file_tree = request.fileTree or []
    files_sample = request.importantFiles or []
    config_files = request.configurationFiles or []
    
    stack_info = static_signals.get("stack", {})
    detected_langs = stack_info.languages if hasattr(stack_info, 'languages') else stack_info.get('languages', [])
    detected_fw = stack_info.frameworks if hasattr(stack_info, 'frameworks') else stack_info.get('frameworks', [])
    detected_db = stack_info.databases if hasattr(stack_info, 'databases') else stack_info.get('databases', [])
    detected_tools = stack_info.tools if hasattr(stack_info, 'tools') else stack_info.get('tools', [])

    # Format file tree string
    tree_str = "\n".join(file_tree[:100]) if file_tree else "No file tree available"
    if len(file_tree) > 100:
        tree_str += f"\n... and {len(file_tree) - 100} more files"

    # Format source code samples
    code_snippets = []
    for f in config_files[:5]:
        code_snippets.append(f"--- CONFIG FILE: {f.path} ---\n{f.content[:2000]}")
    for f in files_sample[:10]:
        code_snippets.append(f"--- SOURCE FILE: {f.path} ---\n{f.content[:3000]}")
    
    code_str = "\n\n".join(code_snippets) if code_snippets else "No source file contents available"

    prompt = f"""
You are a Staff Software Architect & Code Auditor.

Perform a rigorous, evidence-based contextual analysis of the following GitHub repository:

REPOSITORY INFORMATION:
- Owner/Repo: {repo.owner}/{repo.name}
- Primary Language: {repo.primaryLanguage or "Unknown"}
- Description: {repo.description or "No description provided"}
- Stars: {repo.metadata.stars if repo.metadata else 0} | Forks: {repo.metadata.forks if repo.metadata else 0}

DETECTED TECH STACK (STATIC EVIDENCE):
- Languages: {", ".join(detected_langs) or "None"}
- Frameworks: {", ".join(detected_fw) or "None"}
- Databases: {", ".join(detected_db) or "None"}
- Tools/Libraries: {", ".join(detected_tools) or "None"}

STATIC ANALYSIS SIGNALS:
- Documentation Evidence: {static_signals.get('documentation', {}).get('evidence', [])}
- Testing Evidence: {static_signals.get('testing', {}).get('evidence', [])}
- Security Evidence: {static_signals.get('security', {}).get('evidence', [])}
- Structure Evidence: {static_signals.get('structure', {}).get('evidence', [])}
- DevOps Evidence: {static_signals.get('devops', {}).get('evidence', [])}

README CONTENT (TRUNCATED):
{readme[:3000]}

DIRECTORY TREE STRUCTURE (SAMPLE):
{tree_str}

SELECTED FILE CONTENTS (SAMPLE):
{code_str}

CRITICAL RULES FOR YOUR EVALUATION:
1. Ground every claim strictly in the provided code snippets and directory structure.
2. DO NOT invent files, dependencies, vulnerabilities, or tests that are not in the provided evidence.
3. Distinguish clearly between observed evidence and inference.
4. Evaluate scores on a 0 to 10 scale (where 10 is flawless production-ready, 5 is average/prototype, 0 is unacceptable).

Respond ONLY with a valid JSON object matching this EXACT schema:
{{
  "detectedStack": {{
    "languages": [{", ".join([f'"{l}"' for l in detected_langs])}],
    "frameworks": [{", ".join([f'"{f}"' for f in detected_fw])}],
    "databases": [{", ".join([f'"{d}"' for d in detected_db])}],
    "tools": [{", ".join([f'"{t}"' for t in detected_tools])}]
  }},
  "codeQuality": {{
    "score": number (0-10),
    "strengths": ["string"],
    "issues": ["string"]
  }},
  "architecture": {{
    "score": number (0-10),
    "strengths": ["string"],
    "issues": ["string"]
  }},
  "documentation": {{
    "score": number (0-10),
    "issues": ["string"]
  }},
  "testing": {{
    "score": number (0-10),
    "issues": ["string"]
  }},
  "security": {{
    "score": number (0-10),
    "issues": ["string"]
  }},
  "maintainability": {{
    "score": number (0-10),
    "issues": ["string"]
  }},
  "interviewReadiness": {{
    "score": number (0-10),
    "reason": "Detailed summary of candidate readiness"
  }},
  "strengths": ["Overall key strength 1", "Overall key strength 2"],
  "criticalIssues": ["Critical issue 1"],
  "recommendations": [
    {{
      "title": "Short title",
      "category": "Architecture | Security | Quality | Testing | Documentation",
      "priority": "high | medium | low",
      "reason": "Why this matters based on evidence",
      "suggestion": "Actionable steps to fix",
      "evidence": ["file/path/here.js"]
    }}
  ]
}}
"""
    return prompt
