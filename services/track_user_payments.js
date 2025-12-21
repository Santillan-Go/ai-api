//import { db } from "./firebase.js"; // adjust path if needed

async function handleSubscriptionFromSession(subscription, invoice = null) {
    console.log(subscription);
    console.log(invoice);
  const email = subscription.customer_email || (invoice && invoice.customer_email);
  const subscriptionId = subscription.id;
  const purchaseDate = new Date(subscription.created * 1000).toISOString();
  const expirationDate = new Date(invoice.expires_at * 1000).toISOString();
  const subscriptionPeriod = subscription.items.data[0].price.recurring.interval;

  console.log({email, subscriptionId, purchaseDate, expirationDate, subscriptionPeriod}); 
  /// we need to find the user by their email and update their subscription info
  /*
  we need to update or create :
  active
false
(boolean)


entitlement
"pro"
(string)


expirationDate
"2025-12-18T23:45:29.000Z"
(string)


purchaseDate
"2025-12-19T12:50:38.664190"
(string)


subscriptionId
"cd_pro_v1"
(string)


subscriptionPeriod
"monthly"
(string)


userID
"santillango10405@gmail.com"
(string)
  ,
  but first we need to check if the user exists in our database
  if not, we may need to create a new user record with their email and subscription info
  */

try {
//       await db.collection("users").doc(email).set({
//     email: email,
//     subscriptionId: subscriptionId,
//     active: subscription.status === "active",
//     entitlement: "pro",
//     purchaseDate: purchaseDate,
//     expirationDate: expirationDate,
//     subscriptionPeriod: subscriptionPeriod,
//     userID: email
//   }, { merge: true });

  console.loq("User subscription updated/created successfully for:", email);
} catch (error) {
    console.error("Error updating/creating user subscription:", error);
}

}

export { handleSubscriptionFromSession };
// async function handleSubscriptionFromSubscription(subscription, invoice = null) {
//   const email = subscription.customer_email || (invoice && invoice.customer_email);
//   const subscriptionId = subscription.id;
//   const purchaseDate = new Date(subscription.created * 1000).toISOString();
//   const expirationDate = new Date(subscription.current_period_end * 1000).toISOString();
//   const subscriptionPeriod = subscription.items.data[0].price.recurring.interval;

//   // Upsert into your DB:
//   await db.users.updateOrCreate({
//     email,
//     subscriptionId,
//     active: subscription.status === "active",
//     entitlement: "pro",
//     purchaseDate,
//     expirationDate,
//     subscriptionPeriod,
//     userID: email
//   });
// }