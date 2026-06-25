/** Conventional Commits — enforced on commit-msg via Husky. */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'test', 'refactor', 'chore', 'ci', 'build', 'perf'],
    ],
  },
};
