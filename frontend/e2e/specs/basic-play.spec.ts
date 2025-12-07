describe('PlotTwist Arena - Basic Gameplay', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Home Page', () => {
    it('should load the home page successfully', () => {
      cy.contains('PLOTTWIST ARENA').should('be.visible');
      cy.contains('Battle AI in the ultimate plot twist showdown').should('be.visible');
    });

    it('should display both game modes', () => {
      cy.contains('MODE 1').should('be.visible');
      cy.contains('MODE 2').should('be.visible');
      cy.contains('AI Guesses Your Twist').should('be.visible');
      cy.contains('You Guess AI\'s Twist').should('be.visible');
    });

    it('should allow entering player name', () => {
      cy.get('input[placeholder*="name"]').type('TestPlayer');
      cy.get('input[placeholder*="name"]').should('have.value', 'TestPlayer');
    });

    it('should navigate to Mode 1 when clicked', () => {
      cy.contains('MODE 1').click();
      cy.url().should('include', '/ai-guess');
    });

    it('should navigate to Mode 2 when clicked', () => {
      cy.contains('MODE 2').click();
      cy.url().should('include', '/human-guess');
    });

    it('should navigate to leaderboard when clicked', () => {
      cy.contains('VIEW LEADERBOARD').click();
      cy.url().should('include', '/leaderboard');
    });
  });

  describe('Mode 1: AI Guesses Your Twist', () => {
    beforeEach(() => {
      cy.visit('/ai-guess');
    });

    it('should display mode 1 page elements', () => {
      cy.contains('AI GUESSES YOUR TWIST').should('be.visible');
      cy.contains('Story Setup').should('be.visible');
      cy.contains('Your Intended Plot Twist').should('be.visible');
    });

    it('should allow entering story setup and twist', () => {
      // Select genre
      cy.get('select').select('mystery');

      // Enter story setup
      cy.get('textarea').first().type('A detective investigates a locked room murder');

      // Enter twist
      cy.get('textarea').last().type('The detective is the murderer');

      // Verify inputs
      cy.get('textarea').first().should('contain.value', 'detective');
      cy.get('textarea').last().should('contain.value', 'murderer');
    });

    it('should have back to home button', () => {
      cy.contains('Back to Home').should('be.visible');
      cy.contains('Back to Home').click();
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });
  });

  describe('Mode 2: You Guess AI\'s Twist', () => {
    beforeEach(() => {
      cy.visit('/human-guess');
    });

    it('should display mode 2 page elements', () => {
      cy.contains('YOU GUESS THE TWIST').should('be.visible');
    });

    it('should show loading state initially', () => {
      // Should show some loading indicator or story setup
      cy.get('[role="region"]', { timeout: 10000 }).should('exist');
    });

    it('should have back to home button', () => {
      cy.contains('Back to Home').should('be.visible');
    });
  });

  describe('Leaderboard', () => {
    beforeEach(() => {
      cy.visit('/leaderboard');
    });

    it('should display leaderboard page', () => {
      cy.contains('LEADERBOARD').should('be.visible');
    });

    it('should have mode filter buttons', () => {
      cy.contains('ALL MODES').should('be.visible');
      cy.contains('AI GUESS').should('be.visible');
      cy.contains('HUMAN GUESS').should('be.visible');
    });

    it('should allow filtering by mode', () => {
      cy.contains('AI GUESS').click();
      cy.contains('AI GUESS').should('have.class', 'cyber-button');
    });

    it('should have back to home button', () => {
      cy.contains('Back to Home').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable on home page', () => {
      cy.visit('/');

      // Tab through interactive elements
      cy.get('body').tab();
      cy.focused().should('have.attr', 'type', 'text'); // Name input

      cy.focused().tab();
      // Should focus on mode 1 or mode 2 card
      cy.focused().should('exist');
    });

    it('should have proper ARIA labels', () => {
      cy.visit('/ai-guess');

      // Check for ARIA attributes
      cy.get('[aria-label]').should('have.length.greaterThan', 0);
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 },
    ];

    viewports.forEach(({ name, width, height }) => {
      it(`should display correctly on ${name}`, () => {
        cy.viewport(width, height);
        cy.visit('/');

        cy.contains('PLOTTWIST ARENA').should('be.visible');
        cy.contains('MODE 1').should('be.visible');
        cy.contains('MODE 2').should('be.visible');
      });
    });
  });
});
