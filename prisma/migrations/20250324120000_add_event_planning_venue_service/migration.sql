-- Event Planning and Venue Services (SiamEZ × The Red Door Bkk)
-- Idempotent: safe to run if row already exists (updates copy and sort order).

INSERT INTO `Service` (
    `id`,
    `slug`,
    `name`,
    `short_description`,
    `description`,
    `type`,
    `price_amount`,
    `price_currency`,
    `form_config`,
    `sort_order`,
    `active`,
    `created_at`,
    `updated_at`
) VALUES (
    'cm3eventplanvenue01svc',
    'event-planning-venue-services',
    'Event Planning and Venue Services',
    'Event planning and venue services in partnership with The Red Door Bkk.',
    'We have partnered with The Red Door Bkk to bring you exceptional event planning and venue services.',
    'quote',
    NULL,
    'THB',
    NULL,
    11,
    true,
    NOW(3),
    NOW(3)
)
ON DUPLICATE KEY UPDATE
    `name` = VALUES(`name`),
    `short_description` = VALUES(`short_description`),
    `description` = VALUES(`description`),
    `type` = VALUES(`type`),
    `sort_order` = VALUES(`sort_order`),
    `active` = VALUES(`active`),
    `updated_at` = NOW(3);
