const net = require('net');

class PortAllocator {
  constructor(startPort = 3100, endPort = 3900) {
    this.startPort = startPort;
    this.endPort = endPort;
    this.allocatedPorts = new Map(); // jobId -> port
  }

  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => resolve(false));
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
    });
  }

  async allocate(jobId) {
    if (this.allocatedPorts.has(jobId)) {
      return this.allocatedPorts.get(jobId);
    }

    for (let port = this.startPort; port <= this.endPort; port += 10) {
      // Evitar puertos ya asignados en memoria
      const inUse = Array.from(this.allocatedPorts.values()).includes(port);
      if (!inUse && (await this.isPortAvailable(port))) {
        this.allocatedPorts.set(jobId, port);
        return port;
      }
    }

    throw new Error(`[PortAllocator] No hay puertos disponibles en el rango ${this.startPort}-${this.endPort}`);
  }

  release(jobId) {
    if (this.allocatedPorts.has(jobId)) {
      const port = this.allocatedPorts.get(jobId);
      this.allocatedPorts.delete(jobId);
      return port;
    }
    return null;
  }

  getPort(jobId) {
    return this.allocatedPorts.get(jobId) || null;
  }
}

module.exports = PortAllocator;
