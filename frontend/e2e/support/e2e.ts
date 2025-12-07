// Cypress E2E support file

// Add custom commands
Cypress.Commands.add('visitHome', () => {
  cy.visit('/');
});

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      visitHome(): Chainable<void>;
    }
  }
}

export {};
