
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { updateStockFromImage } from "./imageTool";

// Create MCP Server
const server = new McpServer({
    name: "Dairy Inventory MCP",
    version: "1.0.0",
});

// Register Tool
server.tool(
    "update_stock_from_image",
    {
        productName: z.string().describe("The name of the product to update"),
        quantity: z.number().describe("The quantity add to stock"),
    },
    async ({ productName, quantity }) => {
        const result = await updateStockFromImage(productName, quantity);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
);

// Start Server
async function startMcpServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP Server running on stdio");
}

if (require.main === module) {
    startMcpServer().catch((error) => {
        console.error("Fatal error in MCP server:", error);
        process.exit(1);
    });
}

export { server, startMcpServer };
