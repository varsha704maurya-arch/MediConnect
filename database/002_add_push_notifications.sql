ALTER TABLE Medicine_Reminders
    ADD COLUMN notified_date DATE NULL;

CREATE TABLE notification_subscriptions (
    subscription_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_push_endpoint (endpoint(255)),
    CONSTRAINT fk_push_subscription_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
