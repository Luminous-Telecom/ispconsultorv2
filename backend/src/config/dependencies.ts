/**
 * Configuração de dependências do sistema
 * Por enquanto apenas Elasticsearch
 */

import type { DependencyConfig } from '../types/dependency';

export const SYSTEM_DEPENDENCIES: DependencyConfig[] = [
  {
    name: 'Elasticsearch',
    description: 'Elasticsearch search engine',
    checkCommand: ['systemctl is-active --quiet elasticsearch', 'command -v elasticsearch'],
    installCommands: [
      // Verificar se está instalado e instalar se necessário
      'bash -c "if ! dpkg -l | grep -q \"^ii.*elasticsearch\"; then apt-get update -qq && apt-get install -y -qq wget apt-transport-https ca-certificates gnupg lsb-release && rm -f /usr/share/keyrings/elasticsearch-keyring.gpg && wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg && echo \"deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main\" | tee /etc/apt/sources.list.d/elastic-8.x.list > /dev/null && apt-get update -qq && apt-get install -y -qq elasticsearch && systemctl daemon-reload && systemctl enable elasticsearch; fi"',
      // Configurar elasticsearch.yml
      'bash -c "ELASTICSEARCH_YML=/etc/elasticsearch/elasticsearch.yml && if [ -f \"$ELASTICSEARCH_YML\" ]; then grep -q \"^xpack.security.enabled: true\" \"$ELASTICSEARCH_YML\" || (grep -q \"^xpack.security.enabled:\" \"$ELASTICSEARCH_YML\" && sed -i \"s/^xpack.security.enabled:.*/xpack.security.enabled: true/\" \"$ELASTICSEARCH_YML\" || echo \"xpack.security.enabled: true\" >> \"$ELASTICSEARCH_YML\"); grep -q \"^network.host: 127.0.0.1\" \"$ELASTICSEARCH_YML\" || (grep -q \"^network.host:\" \"$ELASTICSEARCH_YML\" && sed -i \"s/^network.host:.*/network.host: 127.0.0.1/\" \"$ELASTICSEARCH_YML\" || echo \"network.host: 127.0.0.1\" >> \"$ELASTICSEARCH_YML\"); grep -q \"^xpack.security.http.ssl.enabled: false\" \"$ELASTICSEARCH_YML\" || (grep -q \"^xpack.security.http.ssl.enabled:\" \"$ELASTICSEARCH_YML\" && sed -i \"s/^xpack.security.http.ssl.enabled:.*/xpack.security.http.ssl.enabled: false/\" \"$ELASTICSEARCH_YML\" || echo \"xpack.security.http.ssl.enabled: false\" >> \"$ELASTICSEARCH_YML\"); grep -q \"^xpack.security.transport.ssl.enabled: false\" \"$ELASTICSEARCH_YML\" || (grep -q \"^xpack.security.transport.ssl.enabled:\" \"$ELASTICSEARCH_YML\" && sed -i \"s/^xpack.security.transport.ssl.enabled:.*/xpack.security.transport.ssl.enabled: false/\" \"$ELASTICSEARCH_YML\" || echo \"xpack.security.transport.ssl.enabled: false\" >> \"$ELASTICSEARCH_YML\"); grep -q \"^xpack.ml.enabled: false\" \"$ELASTICSEARCH_YML\" || (grep -q \"xpack.ml.enabled\" \"$ELASTICSEARCH_YML\" && sed -i \"s/^xpack.ml.enabled:.*/xpack.ml.enabled: false/\" \"$ELASTICSEARCH_YML\" || echo \"xpack.ml.enabled: false\" >> \"$ELASTICSEARCH_YML\"); chown elasticsearch:elasticsearch \"$ELASTICSEARCH_YML\" 2>/dev/null || true; fi"',
      // Iniciar/Reiniciar se necessário
      'bash -c "systemctl start elasticsearch 2>/dev/null || systemctl restart elasticsearch"',
      // Configurar JVM heap
      'bash -c "mkdir -p /etc/elasticsearch/jvm.options.d && echo -e \"# Configuração de heap do Elasticsearch\\n-Xms512m\\n-Xmx512m\" > /etc/elasticsearch/jvm.options.d/heap.options"'
    ],
    requiresSudo: true,
    versionCommand: 'elasticsearch --version 2>/dev/null | grep -oP "version \\K[0-9.]+" || echo ""',
    skipIfExists: true
  }
];
