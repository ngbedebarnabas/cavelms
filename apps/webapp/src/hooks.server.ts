import { db } from "$lib/server/database";
import type { Handle } from "@sveltejs/kit";
import jwt from "jsonwebtoken";
import { API_KEY, AUTH_SECRET } from "$env/static/private";
import { dev } from "$app/environment";
import { RoleType, setSession } from "$houdini";
import { RBAC, computeMenus } from "$lib/store/routes";
import { Gender } from "@prisma/client";

export const handle = (async ({ event, resolve }) => {
  if (!API_KEY && dev) {
    const jwtUser = { role: "beznet", email: "beznet22@gmail.com" };
    const ENV_API_KEY = jwt.sign(jwtUser, AUTH_SECRET, { expiresIn: "90d" });
    console.log({ ENV_API_KEY });
  }

  let token = event.cookies.get("token");
  if (!token) {
    return await resolve(event);
  }

  let claim = jwt.verify(token, AUTH_SECRET) as jwt.JwtPayload;
  let id = claim.userId;
  const user = await db.user.findUnique({ where: { id }, include: { role: true } });
  if (!user) {
    return await resolve(event);
  }

  const jwtUser = { role: "beznet", email: user.email };
  user.accessToken = jwt.sign(jwtUser, AUTH_SECRET, { expiresIn: "1m" });
  event.locals.authUser = user;

  const modules =  import.meta.glob("./routes/**/**.svelte");
  // console.log(computeMenus(modules));

  const { granted, routes } = RBAC({
    routId: event.params.id as string,
    path: event.url.pathname,
    role: user.role?.roleType as string,
  });

  event.locals.routes = routes;
  return await resolve(event);
}) satisfies Handle;
