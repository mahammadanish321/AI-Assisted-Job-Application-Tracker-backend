/**
 * Performance monitoring utility for tracking server startup and operation metrics
 * Helps identify bottlenecks during deployment and runtime
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private startTime = Date.now();

  /**
   * Start tracking a metric
   */
  start(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: Date.now(),
    });
    console.log(
      `[PERF] Started: ${name} (${this.getElapsedSinceServerStart()}ms since startup)`
    );
  }

  /**
   * End tracking a metric and calculate duration
   */
  end(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[PERF] Warning: metric "${name}" was never started`);
      return 0;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    console.log(
      `[PERF] Completed: ${name} (${metric.duration}ms) [${this.getElapsedSinceServerStart()}ms total]`
    );

    return metric.duration;
  }

  /**
   * Get elapsed time since server started
   */
  private getElapsedSinceServerStart(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics as a summary
   */
  getSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.metrics.forEach((metric) => {
      if (metric.duration !== undefined) {
        summary[metric.name] = metric.duration;
      }
    });
    return summary;
  }

  /**
   * Print summary of all metrics
   */
  printSummary(): void {
    console.log('\n=== PERFORMANCE SUMMARY ===');
    const summary = this.getSummary();
    Object.entries(summary).forEach(([name, duration]) => {
      console.log(`${name}: ${duration}ms`);
    });
    console.log(
      `Total Server Uptime: ${this.getElapsedSinceServerStart()}ms\n`
    );
  }

  /**
   * Check if a metric took longer than expected (useful for alerts)
   */
  isMetricSlow(name: string, thresholdMs: number): boolean {
    const metric = this.metrics.get(name);
    return (metric?.duration ?? 0) > thresholdMs;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
