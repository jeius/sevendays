import { Hono } from 'hono';
import type { Env } from '../env.js';
import { appointments } from './appointments.js';
import { branches } from './branches.js';

export const v1 = new Hono<{ Bindings: Env }>();
v1.route('/branches', branches);
v1.route('/appointments', appointments);
// Task 4 adds service-packages + addon-services here.
