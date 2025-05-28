#!/bin/bash

set -e
set -u

function create_and_initialize_database() {
    local database=$1
    echo "=== Processing database: $database ==="
    
    # Create database if it doesn't exist
    if psql -lqt | cut -d \| -f 1 | grep -qw "$database"; then
        echo "Database '$database' already exists"
    else
        echo "Creating database '$database'"
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
            CREATE DATABASE $database;
            GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
    fi
    
    # Find and execute initialization files for this database
    for sql_file in /docker-entrypoint-initdb.d/*${database}*.sql; do
        if [ -f "$sql_file" ]; then
            echo "Found initialization file: $sql_file"
            echo "Executing $sql_file on database $database"
            if psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" -f "$sql_file"; then
                echo "Successfully executed $sql_file"
            else
                echo "Error executing $sql_file"
                return 1
            fi
        fi
    done
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "=== Multiple database initialization started ==="
    echo "Requested databases: $POSTGRES_MULTIPLE_DATABASES"
    
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        if ! create_and_initialize_database $db; then
            echo "Failed to process database: $db"
            exit 1
        fi
    done
    
    echo "=== Multiple database initialization completed successfully ==="
fi 