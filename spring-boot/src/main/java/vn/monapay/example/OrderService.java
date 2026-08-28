package vn.monapay.example;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class OrderService {
    public record Order(String id, long amount, String status, String transactionCode) {}
    public record PaymentResult(boolean ok, boolean duplicate, String reason) {}

    private final Map<String, Order> orders = new ConcurrentHashMap<>();

    public OrderService() {
        orders.put("DH10234", new Order("DH10234", 2_500_000, "pending", null));
    }

    public Order find(String id) {
        return orders.get(id);
    }

    public synchronized PaymentResult markPaidOnce(String id, long amount, String transactionCode) {
        Order order = orders.get(id);
        if (order == null) return new PaymentResult(false, false, "order_not_found");
        if (order.amount() != amount) return new PaymentResult(false, false, "amount_mismatch");
        if (transactionCode.equals(order.transactionCode())) return new PaymentResult(true, true, null);
        if ("paid".equals(order.status())) return new PaymentResult(false, false, "order_already_paid");
        orders.put(id, new Order(id, amount, "paid", transactionCode));
        return new PaymentResult(true, false, null);
    }
}
