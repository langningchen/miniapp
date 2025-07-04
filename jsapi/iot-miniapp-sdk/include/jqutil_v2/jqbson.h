/* json11
 *
 * json11 is a tiny JSON library for C++11, providing JSON parsing and serialization.
 *
 * The core object provided by the library is Bson. A Bson object represents any JSON
 * value: null, bool, number (int or double), string (std::string), array (std::vector), or
 * object (std::map).
 *
 * Bson objects act like values: they can be assigned, copied, moved, compared for equality or
 * order, etc. There are also helper methods Bson::dump, to serialize a Bson to a string, and
 * Bson::parse (static) to parse a std::string as a Bson object.
 *
 * Internally, the various types of Bson object are represented by the BsonValue class
 * hierarchy.
 *
 * A note on numbers - JSON specifies the syntax of number formatting but not its semantics,
 * so some JSON implementations distinguish between integers and floating-point numbers, while
 * some don't. In json11, we choose the latter. Because some JSON implementations (namely
 * Javascript itself) treat all numbers as the same type, distinguishing the two leads
 * to JSON that will be *silently* changed by a round-trip through those implementations.
 * Dangerous! To avoid that risk, json11 stores all numbers as double internally, but also
 * provides integer helpers.
 *
 * Fortunately, double-precision IEEE754 ('double') can precisely store any integer in the
 * range +/-2^53, which includes every 'int' on most systems. (Timestamps often use int64
 * or long long to avoid the Y2038K problem; a double storing microseconds since some epoch
 * will be exact for +/- 275 years.)
 */

/* Copyright (c) 2013 Dropbox, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

#pragma once

#include "jqutil_v2/JQDefs.h"
#include <string>
#include <vector>
#include <map>
#include <memory>
#include "utils/REF.h"

#ifdef _MSC_VER
#if _MSC_VER <= 1800  // VS 2013
#ifndef noexcept
#define noexcept throw()
#endif

#ifndef snprintf
#define snprintf _snprintf_s
#endif
#endif
#endif

namespace JQUTIL_NS {

enum BsonParse {
    STANDARD,
    COMMENTS
};

class BsonValue;

class Bson
{
public:
    // Types
    enum Type {
        NUL,
        // NUMBER,
        DOUBLE,
        INT,
        BOOL,
        STRING,
        ARRAY,
        OBJECT,
        BINARY
    };

    // Array and object typedefs
    typedef std::vector< Bson > array;
    typedef std::map< std::string, Bson > object;
    typedef std::vector< uint8_t > binary;

    // Constructors for the various types of JSON value.
    Bson();                          // NUL
    Bson(double value);              // NUMBER DOUBLE
    Bson(int value);                 // NUMBER INT
    Bson(bool value);                // BOOL
    Bson(const std::string& value);  // STRING
    Bson(const char* value);         // STRING
    Bson(const array& values);       // ARRAY
    Bson(const object& values);      // OBJECT
    Bson(const std::vector<uint8_t> &binary);  // BINARY

    // Implicit constructor: anything with a to_json() function.
    //    template < class T, class = decltype(&T::to_json) >
    //    Bson(const T& t) :
    //            Bson(t.to_json())
    //    {
    //    }

    // Implicit constructor: map-like objects (std::map, std::unordered_map, etc)
    //    template < class M, typename std::enable_if<
    //                                std::is_constructible< std::string, decltype(std::declval< M >().begin()->first) >::value && std::is_constructible< Bson, decltype(std::declval< M >().begin()->second) >::value,
    //                                int >::type = 0 >
    //    Bson(const M& m) :
    //            Bson(object(m.begin(), m.end()))
    //    {
    //    }
    //
    //    // Implicit constructor: vector-like objects (std::list, std::vector, std::set, etc)
    //    template < class V, typename std::enable_if<
    //                                std::is_constructible< Bson, decltype(*std::declval< V >().begin()) >::value,
    //                                int >::type = 0 >
    //    Bson(const V& v) :
    //            Bson(array(v.begin(), v.end()))
    //    {
    //    }

    // This prevents Bson(some_pointer) from accidentally producing a bool. Use
    // Bson(bool(some_pointer)) if that behavior is desired.
    //    Bson(void*) = delete;

    // Accessors
    Type type() const;

    bool is_null() const
    {
        return type() == NUL;
    }
    bool is_number() const
    {
        return type() == DOUBLE || type() == INT;
    }
    bool is_double() const
    {
        return type() == DOUBLE;
    }
    bool is_int() const
    {
        return type() == INT;
    }
    bool is_bool() const
    {
        return type() == BOOL;
    }
    bool is_string() const
    {
        return type() == STRING;
    }
    bool is_array() const
    {
        return type() == ARRAY;
    }
    bool is_object() const
    {
        return type() == OBJECT;
    }
    bool is_binary() const
    {
        return type() == BINARY;
    }

    // Return the enclosed value if this is a number, 0 otherwise. Note that json11 does not
    // distinguish between integer and non-integer numbers - number_value() and int_value()
    // can both be applied to a NUMBER-typed object.
    double number_value() const;
    double double_value() const;
    int int_value() const;

    // Return the enclosed value if this is a boolean, false otherwise.
    bool bool_value() const;
    // Return the enclosed string if this is a string, "" otherwise.
    const std::string& string_value() const;
    // Return the enclosed std::vector if this is an array, or an empty vector otherwise.
    const array& array_items() const;
    // Return the enclosed std::map if this is an object, or an empty map otherwise.
    const object& object_items() const;
    const binary& binary_value() const;

    // Return a reference to arr[i] if this is an array, Bson() otherwise.
    const Bson& operator[](size_t i) const;
    // Return a reference to obj[key] if this is an object, Bson() otherwise.
    const Bson& operator[](const std::string& key) const;

    // Serialize.
    void dump(std::string& out) const;
    std::string dump() const
    {
        std::string out;
        dump(out);
        return out;
    }

    // Parse. If parse fails, return Bson() and assign an error message to err.
    static Bson parse(const std::string& in,
                      std::string& err,
                      BsonParse strategy = STANDARD);
    static Bson parse(const char* in,
                      std::string& err,
                      BsonParse strategy = STANDARD)
    {
        if (in) {
            return parse(std::string(in), err, strategy);
        } else {
            err = "null input";
            return Bson();
        }
    }
    // Parse multiple objects, concatenated or separated by whitespace
    static std::vector< Bson > parse_multi(
            const std::string& in,
            std::string::size_type& parser_stop_pos,
            std::string& err,
            BsonParse strategy = STANDARD);

    static inline std::vector< Bson > parse_multi(
            const std::string& in,
            std::string& err,
            BsonParse strategy = STANDARD)
    {
        std::string::size_type parser_stop_pos;
        return parse_multi(in, parser_stop_pos, err, strategy);
    }

    bool operator==(const Bson& rhs) const;
    bool operator<(const Bson& rhs) const;
    bool operator!=(const Bson& rhs) const
    {
        return !(*this == rhs);
    }
    bool operator<=(const Bson& rhs) const
    {
        return !(rhs < *this);
    }
    bool operator>(const Bson& rhs) const
    {
        return (rhs < *this);
    }
    bool operator>=(const Bson& rhs) const
    {
        return !(*this < rhs);
    }

    /* has_shape(types, err)
     *
     * Return true if this is a JSON object and, for each item in types, has a field of
     * the given type. If not, return false and set err to a descriptive message.
     */
    //    typedef std::initializer_list< std::pair< std::string, Type > > shape;
    //    bool has_shape(const shape& types, std::string& err) const;

private:
    JQuick::sp< BsonValue > m_ptr;
};

// Internal class hierarchy - BsonValue objects are not exposed to users of this API.
class BsonValue : public JQuick::REF_BASE
{
protected:
    friend class Bson;
    friend class BsonInt;
    friend class BsonDouble;
    virtual Bson::Type type() const = 0;
    virtual bool equals(const BsonValue* other) const = 0;
    virtual bool less(const BsonValue* other) const = 0;
    virtual void dump(std::string& out) const = 0;
    virtual double number_value() const;
    virtual double double_value() const;
    virtual int int_value() const;
    virtual bool bool_value() const;
    virtual const std::string& string_value() const;
    virtual const Bson::array& array_items() const;
    virtual const Bson& operator[](size_t i) const;
    virtual const Bson::object& object_items() const;
    virtual const Bson& operator[](const std::string& key) const;
    virtual const Bson::binary& binary_value() const;
    virtual ~BsonValue() {}
};

}  // namespace JQUTIL_NS
