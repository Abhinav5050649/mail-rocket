CREATE INDEX "address_organization_id_idx" ON "address" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "address_user_id_idx" ON "address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaign_organization_id_idx" ON "campaign" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contact_details_organization_id_idx" ON "contact_details" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contact_details_user_id_idx" ON "contact_details" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "group_campaign_id_idx" ON "group" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "group_organization_id_idx" ON "group" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "identity_organization_id_idx" ON "identity" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_user_user_id_idx" ON "organization_user" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipients_group_id_idx" ON "recipients" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "recipients_campaign_id_idx" ON "recipients" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "recipients_organization_id_idx" ON "recipients" USING btree ("organization_id");