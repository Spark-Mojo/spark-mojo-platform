#!/bin/bash
# Willow Ops — Ralph setup script
# Run once to install Ralph into this project
#
# Prerequisites:
#   - Claude Code installed: npm install -g @anthropic-ai/claude-code
#   - jq installed: brew install jq
#   - Authenticated with Claude Code: claude auth
#
# Usage:
#   chmod +x scripts/ralph/setup.sh
#   ./scripts/ralph/setup.sh

echo "Downloading Ralph..."
curl -s https://raw.githubusercontent.com/snarktank/ralph/main/ralph.sh \
  -o scripts/ralph/ralph.sh
chmod +x scripts/ralph/ralph.sh

echo "Ralph installed at scripts/ralph/ralph.sh"
echo ""
echo "To run the build loop:"
echo "  ./scripts/ralph/ralph.sh --tool claude 25"
echo ""
echo "This will run up to 25 iterations of Claude Code, one story at a time."
echo "Each iteration picks the highest-priority story where passes=false,"
echo "implements it, commits, and marks it done in prd.json."
echo ""
echo "Monitor progress:"
echo "  cat prd.json | jq '.userStories[] | {id, title, passes}'"
echo "  cat progress.txt"
echo "  git log --oneline -10"
