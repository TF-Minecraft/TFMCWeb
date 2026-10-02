package net.tfminecraft.tfmcweb.api;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import net.tfminecraft.tfmcweb.Cache;

final class HttpFixture implements AutoCloseable {
    record Reply(int status, byte[] body) {}
    record Request(String method, String path, String body, String key, String contentType) {}
    private final HttpServer server;
    private final LinkedBlockingQueue<Reply> replies = new LinkedBlockingQueue<>();
    private final LinkedBlockingQueue<Request> requests = new LinkedBlockingQueue<>();
    HttpFixture() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            try {
                requests.add(new Request(exchange.getRequestMethod(), exchange.getRequestURI().toString(),
                    new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8),
                    exchange.getRequestHeaders().getFirst("X-Plugin-Key"),
                    exchange.getRequestHeaders().getFirst("Content-Type")));
                Reply reply = replies.poll();
                if (reply == null) reply = new Reply(500, "Unexpected request".getBytes(StandardCharsets.UTF_8));
                exchange.sendResponseHeaders(reply.status(), reply.body().length == 0 ? -1 : reply.body().length);
                exchange.getResponseBody().write(reply.body());
            } finally { exchange.close(); }
        });
        server.start();
        Cache.apiBaseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
        Cache.pluginKey = "unit-test-key";
    }
    void reply(int status, String body) { reply(status, body.getBytes(StandardCharsets.UTF_8)); }
    void reply(int status, byte[] body) { replies.add(new Reply(status, body)); }
    Request request() throws Exception {
        Request request = requests.poll(2, TimeUnit.SECONDS);
        if (request == null) throw new AssertionError("HTTP request not received");
        return request;
    }
    @Override public void close() { server.stop(0); }
}
