import { db } from "./firebase.js"; // adjust path if needed

async function handleSubscriptionFromSession(subscription, invoice = null) {
    console.log(subscription);
    console.log(invoice);
  const email = subscription.customer_email || (invoice && invoice.customer_email);
  const subscriptionId = subscription.id;
  const purchaseDate = new Date(subscription.created * 1000).toISOString();
  
  // Only create expirationDate if expires_at exists
  const expirationDate = invoice?.expires_at 
    ? new Date(invoice.expires_at * 1000).toISOString() 
    : undefined;
    
  const subscriptionPeriod = subscription.items.data[0].price.recurring.interval;

  console.log({email, subscriptionId, purchaseDate, expirationDate, subscriptionPeriod}); 

  const subscriptionData = {
        email,
        subscriptionId,
        active: subscription.status === "active",
        entitlement: "pro",
        purchaseDate,
        subscriptionPeriod,
        userID: email
    };
    
    // Only add expirationDate if it's defined
    if (expirationDate) {
      subscriptionData.expirationDate = expirationDate;
    }
    try {
    
    await db.collection("users").doc(email).collection("subscription").doc("pro").set(
      subscriptionData,
      { merge: true }
    );
      // merge:true to update existing fields without overwriting the entire document

  console.log("User subscription updated/created successfully for:", email);
} catch (error) {
    console.error("Error updating/creating user subscription:", error);


}
}

export { handleSubscriptionFromSession };
