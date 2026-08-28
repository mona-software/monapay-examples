package vn.monapay.example;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WebhookController {
    private static final Pattern ORDER_ID = Pattern.compile("\\bDH\\d+\\b", Pattern.CASE_INSENSITIVE);
    private final ObjectMapper json;
    private final OrderService orders;
    private final MonaPayClient monapay;

    @Value("${MONAPAY_WEBHOOK_SECRET}") private String webhookSecret;

    public WebhookController(ObjectMapper json, OrderService orders, MonaPayClient monapay) {
        this.json = json;
        this.orders = orders;
        this.monapay = monapay;
    }

    @PostMapping("/orders/{id}/qr")
    public ResponseEntity<?> createQr(@PathVariable String id) throws Exception {
        OrderService.Order order = orders.find(id);
        if (order == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("order", order, "qr", monapay.createQr(order)));
    }

    @PostMapping("/webhooks/monapay")
    public ResponseEntity<?> webhook(@RequestBody byte[] rawBody, @RequestHeader Map<String, String> headers) throws Exception {
        String timestamp = header(headers, "x-mona-timestamp");
        String signature = header(headers, "x-mona-signature");
        if (!validTimestamp(timestamp) || signature == null || !verify(rawBody, timestamp, signature)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("ok", false, "reason", "invalid_signature"));
        }
        JsonNode payload = json.readTree(rawBody);
        String orderId = payload.path("order_id").asText("");
        if (orderId.isEmpty()) {
            Matcher matcher = ORDER_ID.matcher(payload.path("description").asText(""));
            if (matcher.find()) orderId = matcher.group();
        }
        OrderService.PaymentResult result = orders.markPaidOnce(
            orderId,
            payload.path("amount").asLong(),
            payload.path("transaction_code").asText()
        );
        if (!result.ok()) {
            HttpStatus status = "order_not_found".equals(result.reason()) ? HttpStatus.NOT_FOUND : HttpStatus.CONFLICT;
            return ResponseEntity.status(status).body(result);
        }
        return ResponseEntity.ok(result);
    }

    private boolean validTimestamp(String value) {
        try {
            long timestamp = Long.parseLong(value);
            return Math.abs(Instant.now().getEpochSecond() - timestamp) <= 300;
        } catch (RuntimeException error) {
            return false;
        }
    }

    private boolean verify(byte[] rawBody, String timestamp, String signature) throws Exception {
        if (!signature.matches("^sha256=[0-9a-fA-F]{64}$")) return false;
        Mac hmac = Mac.getInstance("HmacSHA256");
        hmac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        hmac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
        byte[] expected = hmac.doFinal(rawBody);
        byte[] supplied = HexFormat.of().parseHex(signature.substring(7));
        return MessageDigest.isEqual(expected, supplied);
    }

    private String header(Map<String, String> headers, String wanted) {
        return headers.entrySet().stream()
            .filter(entry -> entry.getKey().toLowerCase(Locale.ROOT).equals(wanted))
            .map(Map.Entry::getValue)
            .findFirst()
            .orElse(null);
    }
}
