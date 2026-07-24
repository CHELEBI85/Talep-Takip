function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export const SERVER_ADMIN_EMAILS = parseList(process.env.NEXT_PUBLIC_ADMIN_EMAILS);

export const SERVER_ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "")
  .split(",")
  .map((uid) => uid.trim())
  .filter(Boolean);
