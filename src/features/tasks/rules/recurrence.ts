import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  getDate,
  getDay,
  getMonth,
  getYear,
  parseISO,
} from "date-fns";

export type FrequencyType =
  | "once"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom";

export type IntervalUnit = "day" | "week" | "month";

export interface RoutineRule {
  frequency_type: FrequencyType;
  /** Usado apenas para frequency_type === "custom" */
  interval_value: number | null;
  /** Usado apenas para frequency_type === "custom" */
  interval_unit: IntervalUnit | null;
  /** 0=Dom…6=Sáb. null = usa o ritmo do start_date */
  weekdays: number[] | null;
  /** 1–31. null = usa o dia do start_date */
  month_day: number | null;
  /** "yyyy-MM-dd" */
  start_date: string;
  /** "yyyy-MM-dd" ou null = sem fim */
  end_date: string | null;
}

/**
 * Retorna array ordenado de datas "yyyy-MM-dd" em [fromDate, toDate] inclusive
 * de acordo com a regra de recorrência.
 */
export function generateOccurrenceDates(
  rule: RoutineRule,
  fromDate: string,
  toDate: string,
): string[] {
  // Respeita end_date quando for anterior ao toDate solicitado
  const effectiveEnd =
    rule.end_date !== null && rule.end_date < toDate ? rule.end_date : toDate;

  const result: string[] = [];

  switch (rule.frequency_type) {
    case "once": {
      if (rule.start_date >= fromDate && rule.start_date <= toDate) {
        result.push(rule.start_date);
      }
      break;
    }

    case "daily": {
      // Começa no maior entre start_date e fromDate
      const start = rule.start_date > fromDate ? rule.start_date : fromDate;
      let current = start;
      while (current <= effectiveEnd) {
        result.push(current);
        current = format(addDays(parseISO(current), 1), "yyyy-MM-dd");
      }
      break;
    }

    case "weekly": {
      if (rule.weekdays !== null) {
        // Itera dia a dia e inclui apenas os dias cujo weekday está em weekdays
        const start = rule.start_date > fromDate ? rule.start_date : fromDate;
        let current = start;
        while (current <= effectiveEnd) {
          const dow = getDay(parseISO(current));
          if (rule.weekdays.includes(dow)) {
            result.push(current);
          }
          current = format(addDays(parseISO(current), 1), "yyyy-MM-dd");
        }
      } else {
        // A cada 7 dias a partir do start_date
        let current = rule.start_date;
        while (current <= effectiveEnd) {
          if (current >= fromDate) {
            result.push(current);
          }
          current = format(addDays(parseISO(current), 7), "yyyy-MM-dd");
        }
      }
      break;
    }

    case "biweekly": {
      if (rule.weekdays !== null) {
        // Itera dia a dia e inclui apenas os dias cujo weekday está em weekdays
        const start = rule.start_date > fromDate ? rule.start_date : fromDate;
        let current = start;
        while (current <= effectiveEnd) {
          const dow = getDay(parseISO(current));
          if (rule.weekdays.includes(dow)) {
            result.push(current);
          }
          current = format(addDays(parseISO(current), 1), "yyyy-MM-dd");
        }
      } else {
        // A cada 14 dias a partir do start_date
        let current = rule.start_date;
        while (current <= effectiveEnd) {
          if (current >= fromDate) {
            result.push(current);
          }
          current = format(addDays(parseISO(current), 14), "yyyy-MM-dd");
        }
      }
      break;
    }

    case "monthly": {
      const startDate = parseISO(rule.start_date);
      // Usa month_day se definido, senão o dia do start_date
      const targetDay = rule.month_day ?? getDate(startDate);
      let year = getYear(startDate);
      let month = getMonth(startDate); // 0-indexed (0=Jan … 11=Dec)

      for (;;) {
        // Otimização: se o primeiro dia do mês já passa o limite, para
        const firstOfMonth = format(new Date(year, month, 1), "yyyy-MM-dd");
        if (firstOfMonth > effectiveEnd) break;

        const daysInMonth = getDaysInMonth(new Date(year, month, 1));
        // Clampeia para o último dia do mês quando o mês tem menos dias
        const day = Math.min(targetDay, daysInMonth);
        const dateStr = format(new Date(year, month, day), "yyyy-MM-dd");

        // Segurança extra caso o clamped date ainda passe o fim
        if (dateStr > effectiveEnd) break;

        if (dateStr >= fromDate && dateStr >= rule.start_date) {
          result.push(dateStr);
        }

        // Avança um mês
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
      break;
    }

    case "custom": {
      const { interval_value: iv, interval_unit: iu } = rule;
      if (iv === null || iu === null) break;

      let n = 0;
      for (;;) {
        let current: string;
        if (iu === "day") {
          current = format(
            addDays(parseISO(rule.start_date), n * iv),
            "yyyy-MM-dd",
          );
        } else if (iu === "week") {
          current = format(
            addDays(parseISO(rule.start_date), n * iv * 7),
            "yyyy-MM-dd",
          );
        } else {
          current = format(
            addMonths(parseISO(rule.start_date), n * iv),
            "yyyy-MM-dd",
          );
        }

        if (current > effectiveEnd) break;
        if (current >= fromDate) {
          result.push(current);
        }
        n += 1;
      }
      break;
    }
  }

  return result;
}
