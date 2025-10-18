import { supabase } from '../config/supabase';

// Define the notification category type to match your database enum
export type NotificationCategory = 'notice' | 'fees' | 'reminder' | 'general';

/**
 * Creates a notification and links it to a specific list of user IDs by calling a Postgres function.
 * This is a generic helper function used by more specific notification functions.
 * @param title The title of the notification.
 * @param content The main message content of the notification.
 * @param category What type of notification it is (notice, fees, reminder, general).
 * @param is_header Whether this notification should be displayed as a header.
 * @param recipientIds An array of user UUIDs who should receive the notification.
 * @param image_url Optional URL of an image to attach to the notification.
 * @returns The number of users the notification was sent to.
 */
export const sendNotificationToUsers = async (
  title: string,
  content: string,
  category: string,
  is_header: boolean,
  recipientIds: string[],
  image_url?: string
): Promise<number> => {
  // If there are no recipients, don't proceed.
  if (!recipientIds || recipientIds.length === 0) {
    console.log("No recipients provided. Notification not sent.");
    return 0;
  }

  console.log(`Attempting to send notification titled "${title}" to ${recipientIds.length} user(s).`);

  // Use Supabase RPC (Remote Procedure Call) to execute the function
  // that you created in the database. This is efficient and secure.
  const { error } = await supabase.rpc('create_notification_with_category_and_header_new', {
    notification_title: title,
    notification_content: content,
    recipient_ids: recipientIds,
    notification_category: category,
    is_header_notification: is_header,
    notification_image_url: image_url || null
  });

  if (error) {
    console.error("Error calling Supabase RPC 'create_notification_with_category_and_header_new':", error);
    throw new Error(`Failed to send notification: ${error.message}`);
  }

  // Return the count of notified users for logging purposes.
  return recipientIds.length;
};

/**
 * Sends a notification to all students enrolled in a specific batch.
 * It first fetches the student IDs and then calls the generic sender function.
 * @param batchId The numeric ID of the batch.
 * @param title The notification title.
 * @param content The notification message.
 * @param category The category of the notification (default: 'general').
 * @param is_header Whether this should be a header notification (default: false).
 * @param image_url Optional URL of an image to attach to the notification.
 */
export const notifyBatch = async (
  batchId: number,
  title: string,
  content: string,
  category: string = 'general',
  is_header: boolean = false,
  image_url?: string
): Promise<number> => {
  // Step 1: Query the database to find all user IDs for the given batch.
  const { data: enrollments, error } = await supabase
    .from('student_batch_enrollments')
    .select('user_id')
    .eq('batch_id', batchId);

  if (error) {
    console.error("Error fetching students for batch:", error);
    throw new Error(`Could not retrieve students for batch ID ${batchId}.`);
  }

  // Extract the user IDs into a simple array of strings.
  const recipientIds = enrollments.map(e => e.user_id);

  // Step 2: Call the core notification sender function with the list of IDs.
  return sendNotificationToUsers(title, content, category, is_header, recipientIds, image_url);
};

/**
 * Sends a notification to every user in the 'profiles' table (a global announcement).
 * It first fetches all user IDs and then calls the generic sender function.
 * @param title The notification title.
 * @param content The notification message.
 * @param category The category of the notification (default: 'general').
 * @param is_header Whether this should be a header notification (default: false).
 * @param image_url Optional URL of an image to attach to the notification.
 */
export const notifyAllUsers = async (
  title: string,
  content: string,
  category: string = 'general',
  is_header: boolean = false,
  image_url?: string
): Promise<number> => {
  // Step 1: Fetch all user IDs from the profiles table.
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id');

  if (error) {
    console.error("Error fetching all users:", error);
    throw new Error("Could not retrieve all users.");
  }

  // Extract the IDs into an array.
  const recipientIds = profiles.map(p => p.id);

  // Step 2: Call the core notification sender function.
  return sendNotificationToUsers(title, content, category, is_header, recipientIds, image_url);
};

/** ----------------------------
 * Notify All Parents
 * ---------------------------- */
export const notifyAllParents = async (
  title: string,
  content: string,
  category: string,
  is_header: boolean,
  image_url?: string
): Promise<number> => {
  // Call the RPC function
  const { data, error } = await supabase.rpc('get_parents_ids_from_values');

  if (error) {
    console.error('Error fetching parent user IDs:', error);
    throw new Error('Could not fetch parent users');
  }

  const parentIds = data?.map((row: any) => row.user_id) || [];

  if (!parentIds.length) {
    return 0;
  }

  // Reuse existing function to send notifications
  return await sendNotificationToUsers(title, content, category, is_header, parentIds, image_url);
};