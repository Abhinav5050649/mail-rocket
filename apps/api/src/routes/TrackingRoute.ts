import { Hono } from "hono";
import { TrackingController } from "../controllers";
import { TrackingService } from "../services";

// Wired up once per process; Hono handlers are bound instance methods, so a
// single shared controller/service pair is safe to reuse across requests.
const trackingService = new TrackingService();
const trackingController = new TrackingController(trackingService);

/**
 * Routes for `/track`: open and click tracking for sent emails. Public - no
 * API key or claim - since subscribers' mail clients load them. Click links
 * are signed, so they only redirect where an email actually linked.
 *
 * - GET /open/:delivery_id  - record an open, return a 1x1 GIF.
 * - GET /click/:delivery_id - record a click, redirect to `url`.
 */
export const trackingRoute = new Hono()
    .get('/open/:delivery_id', trackingController.open)
    .get('/click/:delivery_id', trackingController.click)
