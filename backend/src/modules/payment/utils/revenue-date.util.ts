/**
 * Utility for parsing and normalizing time ranges in Vietnam Time (UTC+7)
 */

export interface ParsedTimeRange {
  startDate: Date;
  endDate: Date;
  groupBy: 'day' | 'month';
}

/**
 * Returns current timestamp components in UTC+7 (Asia/Ho_Chi_Minh)
 */
export function getVietnamNow(): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hours: number;
  minutes: number;
  seconds: number;
} {
  const now = new Date();
  const vnOffsetMs = 7 * 60 * 60 * 1000;
  const vnDate = new Date(now.getTime() + vnOffsetMs);
  return {
    year: vnDate.getUTCFullYear(),
    month: vnDate.getUTCMonth() + 1,
    day: vnDate.getUTCDate(),
    hours: vnDate.getUTCHours(),
    minutes: vnDate.getUTCMinutes(),
    seconds: vnDate.getUTCSeconds(),
  };
}

export function createVnDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0,
): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  const padMs = (n: number) => String(n).padStart(3, '0');
  const isoStr = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${padMs(ms)}+07:00`;
  return new Date(isoStr);
}

export function parseRevenueTimeRange(
  timeRange?: string,
  customStart?: string,
  customEnd?: string,
): ParsedTimeRange {
  const vn = getVietnamNow();

  // If custom start & end are provided or timeRange === 'custom'
  if (timeRange === 'custom' || (!timeRange && customStart && customEnd)) {
    let start: Date;
    let end: Date;

    if (customStart) {
      if (customStart.includes('T')) {
        start = new Date(customStart);
      } else {
        const [y, m, d] = customStart.split('-').map(Number);
        start = createVnDate(y, m, d, 0, 0, 0, 0);
      }
    } else {
      start = createVnDate(vn.year, vn.month, vn.day, 0, 0, 0, 0);
    }

    if (customEnd) {
      if (customEnd.includes('T')) {
        end = new Date(customEnd);
      } else {
        const [y, m, d] = customEnd.split('-').map(Number);
        end = createVnDate(y, m, d, 23, 59, 59, 999);
      }
    } else {
      end = createVnDate(vn.year, vn.month, vn.day, 23, 59, 59, 999);
    }

    if (start.getTime() > end.getTime()) {
      const temp = start;
      start = end;
      end = temp;
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return {
      startDate: start,
      endDate: end,
      groupBy: diffDays > 90 ? 'month' : 'day',
    };
  }

  const range = (timeRange || '30days').toLowerCase();

  switch (range) {
    case 'today': {
      return {
        startDate: createVnDate(vn.year, vn.month, vn.day, 0, 0, 0, 0),
        endDate: createVnDate(vn.year, vn.month, vn.day, 23, 59, 59, 999),
        groupBy: 'day',
      };
    }

    case 'yesterday': {
      const yesterdayMs = createVnDate(vn.year, vn.month, vn.day, 0, 0, 0, 0).getTime() - 86400000;
      const yDate = new Date(yesterdayMs + 7 * 3600000);
      const yY = yDate.getUTCFullYear();
      const yM = yDate.getUTCMonth() + 1;
      const yD = yDate.getUTCDate();
      return {
        startDate: createVnDate(yY, yM, yD, 0, 0, 0, 0),
        endDate: createVnDate(yY, yM, yD, 23, 59, 59, 999),
        groupBy: 'day',
      };
    }

    case '7days': {
      const startMs = createVnDate(vn.year, vn.month, vn.day, 0, 0, 0, 0).getTime() - 6 * 86400000;
      const sDate = new Date(startMs + 7 * 3600000);
      return {
        startDate: createVnDate(sDate.getUTCFullYear(), sDate.getUTCMonth() + 1, sDate.getUTCDate(), 0, 0, 0, 0),
        endDate: createVnDate(vn.year, vn.month, vn.day, 23, 59, 59, 999),
        groupBy: 'day',
      };
    }

    case 'thismonth': {
      // Last day of this month
      const lastDay = new Date(Date.UTC(vn.year, vn.month, 0)).getUTCDate();
      return {
        startDate: createVnDate(vn.year, vn.month, 1, 0, 0, 0, 0),
        endDate: createVnDate(vn.year, vn.month, lastDay, 23, 59, 59, 999),
        groupBy: 'day',
      };
    }

    case 'lastmonth': {
      let lYear = vn.year;
      let lMonth = vn.month - 1;
      if (lMonth < 1) {
        lMonth = 12;
        lYear -= 1;
      }
      const lastDay = new Date(Date.UTC(lYear, lMonth, 0)).getUTCDate();
      return {
        startDate: createVnDate(lYear, lMonth, 1, 0, 0, 0, 0),
        endDate: createVnDate(lYear, lMonth, lastDay, 23, 59, 59, 999),
        groupBy: 'day',
      };
    }

    case 'thisyear': {
      return {
        startDate: createVnDate(vn.year, 1, 1, 0, 0, 0, 0),
        endDate: createVnDate(vn.year, 12, 31, 23, 59, 59, 999),
        groupBy: 'month',
      };
    }

    case '30days':
    default: {
      const startMs = createVnDate(vn.year, vn.month, vn.day, 0, 0, 0, 0).getTime() - 29 * 86400000;
      const sDate = new Date(startMs + 7 * 3600000);
      return {
        startDate: createVnDate(sDate.getUTCFullYear(), sDate.getUTCMonth() + 1, sDate.getUTCDate(), 0, 0, 0, 0),
        endDate: createVnDate(vn.year, vn.month, vn.day, 23, 59, 59, 999),
        groupBy: 'day',
      };
    }
  }
}

