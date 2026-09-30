// The shell's root lands on the packages worklist — no dashboard surface
// ships in this build, and a routeless `/` is not an option (post-login
// needs a landing screen). The removed appointments path answers with the
// router's not-found (#168).
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_shell/')({
  beforeLoad: () => {
    throw redirect({ to: '/packages' });
  },
});
