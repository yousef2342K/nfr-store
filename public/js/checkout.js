// Checkout Page JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Redirect if cart is empty
    if (cart.items.length === 0) {
        window.location.href = '/shop.html';
        return;
    }

    displayOrderSummary();
    setupCheckoutForm();

    // Pre-fill user data if logged in
    if (auth.isLoggedIn() && auth.user) {
        document.querySelector('[name="name"]').value = auth.user.name || '';
        document.querySelector('[name="phone"]').value = auth.user.phone || '';
        
        if (auth.user.address) {
            document.querySelector('[name="street"]').value = auth.user.address.street || '';
            document.querySelector('[name="city"]').value = auth.user.address.city || '';
            document.querySelector('[name="state"]').value = auth.user.address.state || '';
            document.querySelector('[name="zipCode"]').value = auth.user.address.zipCode || '';
            document.querySelector('[name="country"]').value = auth.user.address.country || 'USA';
        }
    }
});

function displayOrderSummary() {
    const items = cart.items;
    const itemsHTML = items.map(item => {
        const primaryImage = item.product.images.find(img => img.isPrimary) || item.product.images[0];
        return `
            <div class="summary-item">
                <div class="summary-item-image">
                    <img src="${primaryImage?.url}" alt="${item.product.name}">
                </div>
                <div class="summary-item-details">
                    <h4>${item.product.name}</h4>
                    <p>Size: ${item.size} | Color: ${item.color}</p>
                    <p>Qty: ${item.quantity}</p>
                </div>
                <div class="summary-item-price">
                    $${(item.product.price * item.quantity).toFixed(2)}
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('orderItems').innerHTML = itemsHTML;

    const subtotal = cart.getTotal();
    const shipping = subtotal >= 100 ? 0 : 10;
    const total = subtotal + shipping;

    document.getElementById('subtotalAmount').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('shippingAmount').textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `$${total.toFixed(2)}`;
}

function setupCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const shippingAddress = {
            name: formData.get('name'),
            phone: formData.get('phone'),
            street: formData.get('street'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zipCode'),
            country: formData.get('country')
        };

        const orderData = {
            items: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                size: item.size,
                color: item.color,
                price: item.product.price
            })),
            shippingAddress,
            notes: formData.get('notes'),
            paymentMethod: formData.get('paymentMethod')
        };

        try {
            // If user is logged in, create order in database
            if (auth.isLoggedIn()) {
                const result = await api.orders.create(orderData);
                
                if (result.success) {
                    // Generate WhatsApp message
                    const whatsappMessage = generateWhatsAppMessage(result.order, shippingAddress);
                    sendWhatsAppOrder(whatsappMessage);
                    
                    // Clear cart
                    cart.clear();
                    
                    // Redirect to success page
                    window.location.href = `/orders.html?success=true&orderId=${result.order.orderNumber}`;
                } else {
                    alert('Error creating order: ' + result.message);
                }
            } else {
                // Guest checkout - direct to WhatsApp
                const whatsappMessage = generateWhatsAppMessageGuest(orderData, shippingAddress);
                sendWhatsAppOrder(whatsappMessage);
                
                // Clear cart
                cart.clear();
                
                // Show success message
                alert('Your order has been sent via WhatsApp! We will contact you shortly.');
                window.location.href = '/';
            }

        } catch (error) {
            console.error('Checkout error:', error);
            alert('Error processing order. Please try again.');
        }
    });
}

function generateWhatsAppMessage(order, address) {
    const items = cart.items;
    let message = `🛍️ *NEW ORDER - ${order.orderNumber}*\n\n`;
    
    message += `📦 *Order Details:*\n`;
    items.forEach((item, index) => {
        message += `${index + 1}. ${item.product.name}\n`;
        message += `   Size: ${item.size} | Color: ${item.color}\n`;
        message += `   Qty: ${item.quantity} × $${item.product.price} = $${(item.quantity * item.product.price).toFixed(2)}\n\n`;
    });

    const subtotal = cart.getTotal();
    const shipping = subtotal >= 100 ? 0 : 10;
    const total = subtotal + shipping;

    message += `💰 *Order Summary:*\n`;
    message += `Subtotal: $${subtotal.toFixed(2)}\n`;
    message += `Shipping: ${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}\n`;
    message += `*Total: $${total.toFixed(2)}*\n\n`;

    message += `📍 *Shipping Address:*\n`;
    message += `${address.name}\n`;
    message += `${address.phone}\n`;
    message += `${address.street}\n`;
    message += `${address.city}, ${address.state} ${address.zipCode}\n`;
    message += `${address.country}\n\n`;

    message += `Thank you for shopping with NFR! 🎉`;

    return message;
}

function generateWhatsAppMessageGuest(orderData, address) {
    let message = `🛍️ *NEW ORDER (Guest)*\n\n`;
    
    message += `📦 *Order Details:*\n`;
    cart.items.forEach((item, index) => {
        message += `${index + 1}. ${item.product.name}\n`;
        message += `   Size: ${item.size} | Color: ${item.color}\n`;
        message += `   Qty: ${item.quantity} × $${item.product.price} = $${(item.quantity * item.product.price).toFixed(2)}\n\n`;
    });

    const subtotal = cart.getTotal();
    const shipping = subtotal >= 100 ? 0 : 10;
    const total = subtotal + shipping;

    message += `💰 *Order Summary:*\n`;
    message += `Subtotal: $${subtotal.toFixed(2)}\n`;
    message += `Shipping: ${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}\n`;
    message += `*Total: $${total.toFixed(2)}*\n\n`;

    message += `📍 *Shipping Address:*\n`;
    message += `${address.name}\n`;
    message += `${address.phone}\n`;
    message += `${address.street}\n`;
    message += `${address.city}, ${address.state} ${address.zipCode}\n`;
    message += `${address.country}\n\n`;

    if (orderData.notes) {
        message += `📝 *Notes:* ${orderData.notes}\n\n`;
    }

    message += `Thank you for shopping with NFR! 🎉`;

    return message;
}

function sendWhatsAppOrder(message) {
    // Replace with your actual WhatsApp business number
    const whatsappNumber = '+1234567890'; // Update this in production
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappURL, '_blank');
}
