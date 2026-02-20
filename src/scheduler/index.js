const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const JOBS_DIR = path.join(__dirname, 'jobs');
const scheduledTasks = [];

function loadJobs() {
  if (!fs.existsSync(JOBS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(JOBS_DIR).filter((f) => f.endsWith('.js'));
  const jobs = [];

  for (const file of files) {
    const filePath = path.join(JOBS_DIR, file);
    const jobModule = require(filePath);

    if (
      !jobModule.name ||
      !jobModule.schedule ||
      typeof jobModule.handler !== 'function'
    ) {
      console.error(
        `[PavleTek-Scheduler] Skipping ${file}: must export { name, schedule, handler }`
      );
      continue;
    }

    jobs.push({
      name: jobModule.name,
      schedule: jobModule.schedule,
      handler: jobModule.handler,
    });
  }

  return jobs;
}

function runWithLogging(job) {
  return async () => {
    const start = Date.now();
    console.log(`[PavleTek-Scheduler] Starting job: ${job.name}`);

    try {
      await job.handler();
      console.log(
        `[PavleTek-Scheduler] Finished job: ${job.name} (${Date.now() - start}ms)`
      );
    } catch (err) {
      console.error(`[PavleTek-Scheduler] Job "${job.name}" failed:`, err);
    }
  };
}

function startScheduler() {
  const jobs = loadJobs();

  if (jobs.length === 0) {
    console.log(
      '[PavleTek-Scheduler] No jobs found in scheduler/jobs/. Add .js files that export { name, schedule, handler }.'
    );
    return;
  }

  for (const job of jobs) {
    if (!cron.validate(job.schedule)) {
      console.error(
        `[PavleTek-Scheduler] Invalid cron schedule for "${job.name}": ${job.schedule}`
      );
      continue;
    }

    const task = cron.schedule(job.schedule, runWithLogging(job));
    scheduledTasks.push({ name: job.name, task });
    console.log(`[PavleTek-Scheduler] Scheduled: ${job.name} (${job.schedule})`);
  }

  console.log(
    `[PavleTek-Scheduler] Scheduler running with ${scheduledTasks.length} job(s).`
  );
}

function stopScheduler() {
  console.log('[PavleTek-Scheduler] Shutting down...');
  for (const { name, task } of scheduledTasks) {
    task.stop();
    console.log(`[PavleTek-Scheduler] Stopped: ${name}`);
  }
  scheduledTasks.length = 0;
  console.log('[PavleTek-Scheduler] Scheduler stopped.');
}

module.exports = {
  startScheduler,
  stopScheduler,
};
