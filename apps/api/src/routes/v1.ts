import { Hono } from 'hono';
import type { Env } from '../env.js';
import { addonServices } from './addon-services.js';
import { appointments } from './appointments.js';
import { branches } from './branches.js';
import { servicePackages } from './service-packages.js';

export const v1 = new Hono<{ Bindings: Env }>();
v1.route('/branches', branches);
v1.route('/appointments', appointments);
v1.route('/service-packages', servicePackages);
v1.route('/addon-services', addonServices);
