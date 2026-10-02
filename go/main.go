package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

type order struct {
	ID              string `json:"id"`
	Amount          int64  `json:"amount"`
	Status          string `json:"status"`
	TransactionCode string `json:"transaction_code,omitempty"`
}

type webhookPayload struct {
	Amount          int64  `json:"amount"`
	Description     string `json:"description"`
	OrderID         string `json:"order_id"`
	TransactionCode string `json:"transaction_code"`
}

type envelope struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Detail  any             `json:"detail"`
	Data    json.RawMessage `json:"data"`
}

var (
	ordersMu = sync.Mutex{}
	orders   = map[string]*order{"DH10234": {ID: "DH10234", Amount: 2500000, Status: "pending"}}
	orderID  = regexp.MustCompile(`(?i)\bDH\d+\b`)
)

func main() {
	http.HandleFunc("/orders/", createQR)
	http.HandleFunc("/webhooks/monapay", webhook)
	port := env("PORT", "8080")
	fmt.Printf("Go example đang nghe tại http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		panic(err)
	}
}

func createQR(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost || !strings.HasSuffix(request.URL.Path, "/qr") {
		writeJSON(response, http.StatusMethodNotAllowed, map[string]any{"error": "method_not_allowed"})
		return
	}
	id := strings.TrimSuffix(strings.TrimPrefix(request.URL.Path, "/orders/"), "/qr")
	ordersMu.Lock()
	item := orders[id]
	ordersMu.Unlock()
	if item == nil {
		writeJSON(response, http.StatusNotFound, map[string]any{"error": "order_not_found"})
		return
	}
	qr, err := monaPayQR(item)
	if err != nil {
		writeJSON(response, http.StatusBadGateway, map[string]any{"error": err.Error()})
		return
	}
	writeJSON(response, http.StatusOK, map[string]any{"order": item, "qr": qr})
}

func webhook(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeJSON(response, http.StatusMethodNotAllowed, map[string]any{"error": "method_not_allowed"})
		return
	}
	rawBody, err := io.ReadAll(http.MaxBytesReader(response, request.Body, 1<<20))
	if err != nil {
		writeJSON(response, http.StatusRequestEntityTooLarge, map[string]any{"error": "payload_too_large"})
		return
	}
	if reason := verifyWebhook(rawBody, request.Header); reason != "" {
		writeJSON(response, http.StatusUnauthorized, map[string]any{"ok": false, "reason": reason})
		return
	}
	var payload webhookPayload
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		writeJSON(response, http.StatusBadRequest, map[string]any{"ok": false, "reason": "invalid_json"})
		return
	}
	if payload.OrderID == "" {
		payload.OrderID = orderID.FindString(payload.Description)
	}

	ordersMu.Lock()
	defer ordersMu.Unlock()
	item := orders[payload.OrderID]
	if item == nil {
		writeJSON(response, http.StatusNotFound, map[string]any{"ok": false, "reason": "order_not_found"})
		return
	}
	if item.Amount != payload.Amount {
		writeJSON(response, http.StatusConflict, map[string]any{"ok": false, "reason": "amount_mismatch"})
		return
	}
	if item.TransactionCode == payload.TransactionCode {
		writeJSON(response, http.StatusOK, map[string]any{"ok": true, "duplicate": true})
		return
	}
	if item.Status == "paid" {
		writeJSON(response, http.StatusConflict, map[string]any{"ok": false, "reason": "order_already_paid"})
		return
	}
	item.Status = "paid"
	item.TransactionCode = payload.TransactionCode
	writeJSON(response, http.StatusOK, map[string]any{"ok": true, "duplicate": false})
}

func verifyWebhook(body []byte, headers http.Header) string {
	timestampText := headers.Get("X-Mona-Timestamp")
	timestamp, err := strconv.ParseInt(timestampText, 10, 64)
	if err != nil {
		return "invalid_timestamp"
	}
	if difference := time.Now().Unix() - timestamp; difference > 300 || difference < -300 {
		return "timestamp_out_of_tolerance"
	}
	signature := headers.Get("X-Mona-Signature")
	if !strings.HasPrefix(signature, "sha256=") {
		return "invalid_signature"
	}
	supplied, err := hex.DecodeString(strings.TrimPrefix(signature, "sha256="))
	if err != nil || len(supplied) != sha256.Size {
		return "invalid_signature"
	}
	mac := hmac.New(sha256.New, []byte(os.Getenv("MONAPAY_WEBHOOK_SECRET")))
	mac.Write([]byte(timestampText + "."))
	mac.Write(body)
	if !hmac.Equal(mac.Sum(nil), supplied) {
		return "invalid_signature"
	}
	return ""
}

func monaPayQR(item *order) (any, error) {
	loginBody := map[string]any{
		"grant_type": "client_credentials", "client_id": os.Getenv("MONAPAY_CLIENT_ID"),
		"client_secret": os.Getenv("MONAPAY_CLIENT_SECRET"),
	}
	loginData, err := apiRequest(http.MethodPost, "/api/v1/oauth/token", loginBody, "")
	if err != nil {
		return nil, err
	}
	var login struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(loginData, &login); err != nil || login.AccessToken == "" {
		return nil, fmt.Errorf("response OAuth không có access_token")
	}
	body := map[string]any{
		"ownerNumber": os.Getenv("MONAPAY_OWNER_NUMBER"), "ownerType": env("MONAPAY_OWNER_TYPE", "ORG"),
		"merchantId": os.Getenv("MONAPAY_MERCHANT_ID"), "terminalId": os.Getenv("MONAPAY_TERMINAL_ID"),
		"orderId": item.ID, "virtualAccountPrefix": os.Getenv("MONAPAY_VA_PREFIX"),
		"beneficiaryName": os.Getenv("MONAPAY_BENEFICIARY_NAME"), "amount": item.Amount,
		"description": "Thanh toan " + item.ID,
	}
	data, err := apiRequest(http.MethodPost, "/api/v1/acb/qr-payment/generate", body, login.AccessToken)
	if err != nil {
		return nil, err
	}
	var result any
	return result, json.Unmarshal(data, &result)
}

func apiRequest(method, path string, body any, token string) (json.RawMessage, error) {
	encoded, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequest(method, env("MONAPAY_BASE_URL", "https://api.monapay.vn")+path, bytes.NewReader(encoded))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/json")
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
		request.Header.Set("X-Client-Secret", os.Getenv("MONAPAY_CLIENT_SECRET"))
	}
	response, err := (&http.Client{Timeout: 10 * time.Second}).Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	var result envelope
	if err := json.NewDecoder(io.LimitReader(response.Body, 1<<20)).Decode(&result); err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 || !result.Success {
		return nil, fmt.Errorf("MONA Pay API lỗi HTTP %d: %s", response.StatusCode, result.Message)
	}
	return result.Data, nil
}

func writeJSON(response http.ResponseWriter, status int, body any) {
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(body)
}

func env(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
