/**
 * Testes básicos para SchedulerService
 */
import { SchedulerService } from '../../services/SchedulerService';

describe('SchedulerService', () => {
  describe('getInstance', () => {
    it('deve retornar instância única (Singleton)', () => {
      const instance1 = SchedulerService.getInstance();
      const instance2 = SchedulerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getStatus', () => {
    it('deve retornar status do scheduler', () => {
      const service = SchedulerService.getInstance();
      const status = service.getStatus();
      
      expect(status).toBeDefined();
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('activeJobs');
      expect(status).toHaveProperty('scheduledRoutines');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.activeJobs).toBe('number');
      expect(Array.isArray(status.scheduledRoutines)).toBe(true);
    });
  });

  describe('getHealthStatus', () => {
    it('deve retornar health status', () => {
      const service = SchedulerService.getInstance();
      const health = service.getHealthStatus();
      
      expect(health).toBeDefined();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('isRunning');
      expect(health).toHaveProperty('activeJobs');
      expect(health).toHaveProperty('uptime');
      expect(['healthy', 'stopped']).toContain(health.status);
      expect(typeof health.isRunning).toBe('boolean');
      expect(typeof health.activeJobs).toBe('number');
      expect(typeof health.uptime).toBe('number');
    });
  });
});

