const config = {
  default: {
    format: ['progress', 'html:./tests/bdd/reports/cucumber-report.html'],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    paths: ['tests/bdd/features/**/*.feature'],
    require: ['tests/bdd/dist/steps/**/*.js', 'tests/bdd/dist/support/**/*.js'],
    publishQuiet: true,
    worldParameters: {
      headless: true,
    },
  },
  
  // Perfil para desarrollo (con UI visible)
  dev: {
    worldParameters: {
      headless: false,
      slowMo: 100,
    },
  },
  
  // Perfil para CI (modo headless)
  ci: {
    paths: ['tests/bdd/features/**/*.feature'],
    require: ['tests/bdd/dist/steps/**/*.js', 'tests/bdd/dist/support/**/*.js'],
    format: ['json:./tests/bdd/reports/cucumber-report.json'],
    worldParameters: {
      headless: true,
    },
  },
};

module.exports = config;