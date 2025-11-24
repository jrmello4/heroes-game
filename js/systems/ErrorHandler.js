// systems/ErrorHandler.js

export const ErrorType = {
  CRITICAL: "CRITICAL",
  WARNING: "WARNING",
  INFO: "INFO",
};

export class ErrorHandler {
  static init() {
    // Captura erros globais não tratados
    window.addEventListener("error", this.handleGlobalError.bind(this));
    window.addEventListener(
      "unhandledrejection",
      this.handlePromiseRejection.bind(this)
    );

    console.log("ErrorHandler: Sistema de erro inicializado");
  }

  static handleGlobalError(event) {
    const error = {
      type: ErrorType.CRITICAL,
      message: event.message,
      file: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now(),
    };

    this.logError(error);
    this.showErrorToUser(
      "Ocorreu um erro inesperado. O jogo continuará funcionando."
    );

    // Previne que o erro quebre o jogo completamente
    event.preventDefault();
    return true;
  }

  static handlePromiseRejection(event) {
    const error = {
      type: ErrorType.WARNING,
      message: event.reason?.message || "Promise rejeitada",
      stack: event.reason?.stack,
      timestamp: Date.now(),
    };

    this.logError(error);

    // Previne alertas no console
    event.preventDefault();
  }

  static logError(errorInfo) {
    const logEntry = {
      ...errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      gameState: this.getSafeGameState(),
    };

    // Salva no localStorage (máximo 50 erros)
    this.saveToErrorLog(logEntry);

    // Também loga no console
    console.error("Game Error:", logEntry);
  }

  static saveToErrorLog(logEntry) {
    try {
      const existingLogs = JSON.parse(
        localStorage.getItem("game_error_log") || "[]"
      );

      // Mantém apenas os últimos 50 erros
      existingLogs.unshift(logEntry);
      if (existingLogs.length > 50) {
        existingLogs.length = 50;
      }

      localStorage.setItem("game_error_log", JSON.stringify(existingLogs));
    } catch (e) {
      console.warn("Não foi possível salvar erro no log:", e);
    }
  }

  static getSafeGameState() {
    try {
      // Retorna um snapshot seguro do estado do jogo (sem dados sensíveis)
      return {
        score: window.gameData?.score || 0,
        level: window.gameData?.level || 1,
        villainsDefeated: window.gameData?.villainsDefeated || 0,
        crystals: window.gameData?.crystals || 0,
      };
    } catch (e) {
      return { error: "Não foi possível obter estado do jogo" };
    }
  }

  static showErrorToUser(message, isFatal = false) {
    // Cria ou atualiza o toast de erro
    let errorToast = document.getElementById("errorToast");

    if (!errorToast) {
      errorToast = document.createElement("div");
      errorToast.id = "errorToast";
      errorToast.className =
        "fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-[1000] max-w-sm hidden";
      errorToast.innerHTML = `
        <div class="flex items-start gap-3">
          <i class="fas fa-exclamation-triangle mt-1"></i>
          <div class="flex-1">
            <p class="font-bold text-sm" id="errorToastMessage"></p>
            <p class="text-xs opacity-80 mt-1">Clique para fechar</p>
          </div>
          <button onclick="ErrorHandler.hideError()" class="text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      document.body.appendChild(errorToast);

      // Fecha ao clicar
      errorToast.addEventListener("click", () => this.hideError());
    }

    const messageEl = document.getElementById("errorToastMessage");
    if (messageEl) {
      messageEl.textContent = message;
    }

    errorToast.classList.remove("hidden");

    // Auto-esconde após 8 segundos se não for fatal
    if (!isFatal) {
      setTimeout(() => this.hideError(), 8000);
    }
  }

  static hideError() {
    const errorToast = document.getElementById("errorToast");
    if (errorToast) {
      errorToast.classList.add("hidden");
    }
  }

  static showSuccess(message) {
    let successToast = document.getElementById("successToast");

    if (!successToast) {
      successToast = document.createElement("div");
      successToast.id = "successToast";
      successToast.className =
        "fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-[1000] max-w-sm hidden";
      successToast.innerHTML = `
        <div class="flex items-start gap-3">
          <i class="fas fa-check-circle mt-1"></i>
          <div class="flex-1">
            <p class="font-bold text-sm" id="successToastMessage"></p>
          </div>
          <button onclick="ErrorHandler.hideSuccess()" class="text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
      document.body.appendChild(successToast);

      successToast.addEventListener("click", () => this.hideSuccess());
    }

    const messageEl = document.getElementById("successToastMessage");
    if (messageEl) {
      messageEl.textContent = message;
    }

    successToast.classList.remove("hidden");
    setTimeout(() => this.hideSuccess(), 4000);
  }

  static hideSuccess() {
    const successToast = document.getElementById("successToast");
    if (successToast) {
      successToast.classList.add("hidden");
    }
  }

  // Função para envolver qualquer função com tratamento de erro
  static safeExecute(fn, fallbackValue = null, context = null) {
    return function (...args) {
      try {
        return fn.apply(context, args);
      } catch (error) {
        this.logError({
          type: ErrorType.WARNING,
          message: `Erro em ${fn.name || "função anônima"}: ${error.message}`,
          stack: error.stack,
          timestamp: Date.now(),
        });

        return fallbackValue;
      }
    }.bind(this);
  }

  // Para funções assíncronas
  static async safeExecuteAsync(fn, fallbackValue = null, context = null) {
    try {
      return await fn.apply(context);
    } catch (error) {
      this.logError({
        type: ErrorType.WARNING,
        message: `Erro assíncrono em ${fn.name || "função anônima"}: ${
          error.message
        }`,
        stack: error.stack,
        timestamp: Date.now(),
      });

      return fallbackValue;
    }
  }
}

// Exportar para acesso global
window.ErrorHandler = ErrorHandler;
