export function isoDate(value = new Date()) {
  return new Date(value).toISOString().slice(0, 10);
}

export function daysBetween(from, to = new Date()) {
  return Math.floor((new Date(to).valueOf() - new Date(from).valueOf()) / 86_400_000);
}

export function monthsAgo(months, from = new Date()) {
  const date = new Date(from);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
}
