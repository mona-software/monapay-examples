package vn.monapay.example;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class MonaPayClient {
    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json;

    @Value("${MONAPAY_CLIENT_ID}") private String clientId;
    @Value("${MONAPAY_CLIENT_SECRET}") private String clientSecret;
    @Value("${MONAPAY_OWNER_NUMBER}") private String ownerNumber;
    @Value("${MONAPAY_OWNER_TYPE:ORG}") private String ownerType;
    @Value("${MONAPAY_MERCHANT_ID}") private String merchantId;
    @Value("${MONAPAY_TERMINAL_ID}") private String terminalId;
    @Value("${MONAPAY_VA_PREFIX}") private String vaPrefix;
    @Value("${MONAPAY_BENEFICIARY_NAME}") private String beneficiaryName;

    public MonaPayClient(ObjectMapper json) {
        this.json = json;
    }

    public JsonNode createQr(OrderService.Order order) throws Exception {
        String token = login();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ownerNumber", ownerNumber);
        body.put("ownerType", ownerType);
        body.put("merchantId", merchantId);
        body.put("terminalId", terminalId);
        body.put("orderId", order.id());
        body.put("virtualAccountPrefix", vaPrefix);
        body.put("beneficiaryName", beneficiaryName);
        body.put("amount", order.amount());
        body.put("description", "Thanh toan " + order.id());
        HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.monapay.vn/api/v1/acb/qr-payment/generate"))
            .header("Authorization", "Bearer " + token)
            .header("X-Client-Secret", clientSecret)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
            .build();
        return data(http.send(request, HttpResponse.BodyHandlers.ofString()));
    }

    private String login() throws Exception {
		String body = json.writeValueAsString(Map.of(
			"grant_type", "client_credentials", "client_id", clientId, "client_secret", clientSecret
		));
		HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.monapay.vn/api/v1/oauth/token"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        return data(http.send(request, HttpResponse.BodyHandlers.ofString())).path("access_token").asText();
    }

    private JsonNode data(HttpResponse<String> response) throws Exception {
        JsonNode envelope = json.readTree(response.body());
        if (response.statusCode() < 200 || response.statusCode() >= 300 || !envelope.path("success").asBoolean()) {
            throw new IllegalStateException("MONA Pay API lỗi HTTP " + response.statusCode() + ": " + response.body());
        }
        return envelope.path("data");
    }
}
